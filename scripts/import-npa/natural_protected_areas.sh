#!/bin/bash
#
# natural_protected_areas PostGIS Integration & FireAlert Sync
#
# This script automates the process of:
# 1. Checking for required PostGIS tools
# 2. Downloading and preparing natural_protected_areas dataset
# 3. Converting shapefiles to SQL
# 4. Handling ID conflicts
# 5. Importing data into FireAlert PostgreSQL database
# 6. Creating necessary backups when working with production data

set -e  # Exit immediately if a command exits with a non-zero status

# Default values
ENVIRONMENT="production"
TEMP_DIR="$(pwd)/tmp"
OUTPUT_SQL="${TEMP_DIR}/natural_protected_areas.sql"
BACKUP_PATH=""
IS_PRODUCTION=true
EXTRACT_DIR="${TEMP_DIR}/extracted"
# Will be passed from Envvironment
# DATASET_URL=""
# DATABASE_URL=""
COPY_BLOCK_ROWS=500  # You can change this globally



# Print a formatted message
print_message() {
  local type=$1
  local message=$2

  case $type in
    info)    echo -e "\033[0;34m[INFO]\033[0m $message" >&2 ;;
    success) echo -e "\033[0;32m[SUCCESS]\033[0m $message" >&2 ;;
    warning) echo -e "\033[0;33m[WARNING]\033[0m $message" >&2 ;;
    error)   echo -e "\033[0;31m[ERROR]\033[0m $message" >&2 ;;
    *)       echo "$message" >&2 ;;
  esac
}

# Format duration in seconds to human readable format
format_duration() {
  local seconds=$1
  local minutes=$(( seconds / 60 ))
  local remaining_seconds=$(( seconds % 60 ))

  if [[ $minutes -gt 0 ]]; then
    echo "${minutes}m ${remaining_seconds}s"
  else
    echo "${remaining_seconds}s"
  fi
}

# Parse command-line arguments
parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --env)
        ENVIRONMENT="$2"
        if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "development" ]]; then
          print_message error "Invalid environment. Must be 'production' or 'development'."
          exit 1
        fi
        if [[ "$ENVIRONMENT" == "development" ]]; then
          IS_PRODUCTION=false
        fi
        shift 2
        ;;
      --url)
        DATASET_URL="$2"
        shift 2
        ;;
      --dburl)
        DATABASE_URL="$2"
        shift 2
        ;;
      --help)
        echo "Usage: $0 [options]"
        echo "Options:"
        echo "  --url URL     URL to the natural_protected_areas dataset zip file"
        echo "  --env ENV     FireAlert environment (production or development)"
        echo "  --dburl URL   FireAlert PostgreSQL database URL"
        echo "  --help        Show this help message"
        exit 0
        ;;
      *)
        print_message error "Unknown option: $1"
        echo "Use --help for usage information."
        exit 1
        ;;
    esac
  done
}

# Check required tools
check_environment() {
  print_message info "Checking for required tools..."

  local missing_tools=()

  for tool in shp2pgsql pg_dump pg_restore psql; do
    if ! command -v $tool &> /dev/null; then
      missing_tools+=("$tool")
      print_message error "$tool is not installed"
    else
      print_message success "$tool is installed"
    fi
  done

  if [[ ${#missing_tools[@]} -gt 0 ]]; then
    print_message error "Required tools are missing: ${missing_tools[*]}"
    print_message info "Please install PostGIS and PostgreSQL client tools"
    return 1
  fi

  return 0
}

# Create and prepare temporary directory
prepare_temp_dir() {
  print_message info "Creating temporary directory..."
  mkdir -p "$TEMP_DIR"
  mkdir -p "$EXTRACT_DIR"
  print_message success "Created temporary directory: $TEMP_DIR"
}

# Download the dataset
download_dataset() {

  if [[ -z "$DATASET_URL" ]]; then
    print_message error "Dataset URL (--url) or DATASET_URL environment variable is required"
    exit 1
  fi

  print_message info "Preparing to download dataset from $DATASET_URL..."

  local zip_name="protected_planet_$(date +%Y%m%d%H%M%S).zip"
  local zip_path="${TEMP_DIR}/${zip_name}"
  local existing_zip=$(find "$TEMP_DIR" -name "protected_planet_*.zip" -type f | sort | tail -n 1)

  if [[ -n "$existing_zip" ]]; then
    print_message info "Found existing dataset: $existing_zip"

    # Check if the existing file is older than a month
    local file_age_days=$(( ( $(date +%s) - $(stat -f %m "$existing_zip") ) / 86400 ))
    if [[ $file_age_days -le 30 ]]; then
      print_message info "Existing dataset is less than a month old. Skipping download."
      echo "$existing_zip"
      return 0
    else
      print_message warning "Existing dataset is older than a month. Downloading the latest dataset."
    fi
  else
    print_message info "No existing dataset found. Proceeding with download."
  fi

  # Download the dataset
  if command -v wget &> /dev/null; then
    print_message info "Using wget to download dataset..."
    wget -q --show-progress -O "$zip_path" "$DATASET_URL"
  elif command -v curl &> /dev/null; then
    print_message info "Using curl to download dataset..."
    curl -L --progress-bar -o "$zip_path" "$DATASET_URL"
  else
    print_message error "Neither wget nor curl is installed"
    return 1
  fi

  if [[ ! -f "$zip_path" ]]; then
    print_message error "Failed to download dataset"
    return 1
  fi

  print_message success "Dataset downloaded to $zip_path"
  echo "$zip_path"
}

# Extract archives
extract_archives() {
  local zip_path=$1

  # Check if file exists before extracting
  if [[ ! -f "$zip_path" ]]; then
    print_message error "Zip file not found: $zip_path"
    return 1
  fi

  if [[ -d "$EXTRACT_DIR" && -n "$(ls -A "$EXTRACT_DIR")" ]]; then
    print_message info "Extraction directory already exists and is not empty. Skipping extraction."
    return 0
  fi

  print_message info "Extracting $zip_path to $EXTRACT_DIR..."

  # Add error handling for unzip
  if ! unzip -q "$zip_path" -d "$EXTRACT_DIR"; then
    print_message error "Failed to unzip $zip_path"
    return 1
  fi

  # Find and extract any nested zip files
  print_message info "Checking for nested zip files..."

  local nested_zips=()
  while IFS= read -r -d $'\0' nested_zip; do
    nested_zips+=("$nested_zip")
  done < <(find "$EXTRACT_DIR" -name "*.zip" -type f -print0)

  for nested_zip in "${nested_zips[@]}"; do
    local nested_dir="${nested_zip%.zip}"
    print_message info "Extracting nested zip: $(basename "$nested_zip")"
    mkdir -p "$nested_dir"
    unzip -q "$nested_zip" -d "$nested_dir"
  done

  print_message success "All archives extracted"
  echo "$EXTRACT_DIR"
}

# Find all shapefiles
find_shapefiles() {

  print_message info "Finding shapefiles..."

  local shapefiles=()
  while IFS= read -r -d $'\0' shapefile; do
    shapefiles+=("$shapefile")
  done < <(find "$EXTRACT_DIR" -name "*-polygons.shp" -type f -print0)

  if [[ ${#shapefiles[@]} -eq 0 ]]; then
    print_message error "No shapefiles found in the extracted dataset"
    return 1
  fi

  print_message success "Found ${#shapefiles[@]} shapefiles"

  # Print shapefiles to a temporary file
  local shapefile_list="${TEMP_DIR}/shapefiles.txt"
  printf "%s\n" "${shapefiles[@]}" > "$shapefile_list"

  echo "$shapefile_list"
}




# ===
convert_shapefiles_to_sql() {
  local polygons_list=$1
  local rows_per_block=${COPY_BLOCK_ROWS:-1000}
  local temp_copy_file="$TEMP_DIR/combined_copy.sql"
  local chunks_dir="$TEMP_DIR/sql_chunks"

  mkdir -p "$chunks_dir"
  : > "$temp_copy_file"

  print_message info "Generating COPY‑only SQL from shapefiles…"
  while IFS= read -r shp; do
    print_message info "  → $(basename "$shp")"
    shp2pgsql -a -D -k -s 4326 -g geom "$shp" "ProtectedArea" >> "$temp_copy_file"
  done < "$polygons_list"

  print_message info "Now splitting into $rows_per_block‑row chunks…"
  awk -v rows_per_block="$rows_per_block" -v prefix="$chunks_dir/chunk_" '
    BEGIN {
      chunk = 0; row = 0;
      in_header = 0;
      copy_header = "";
      outfile = "";
    }
    # Start of a COPY header
    /^COPY / {
      copy_header = $0;
      if ($0 !~ /stdin;/) {
        in_header = 1;
      } else {
        in_header = 0;
      }
      next;
    }
    # If we’re in a multi‑line header, capture until FROM stdin;
    in_header {
      copy_header = copy_header "\n" $0;
      if ($0 ~ /stdin;/) in_header = 0;
      next;
    }
    # Skip all metadata/control lines
    /^(BEGIN;|COMMIT;|ANALYZE|SET )/ { next; }
    # Skip end‑of‑copy markers
    /^\\\.$/ { next; }
    # If we don’t yet have a header, ignore everything
    copy_header == "" { next; }
    # Actual data row
    {
      # If this row starts a new chunk
      if (row % rows_per_block == 0) {
        # close previous chunk
        if (outfile != "") {
          print "\\." >> outfile
          print "COMMIT;" >> outfile
          print "ANALYZE;" >> outfile
          close(outfile)
        }
        # open new chunk file
        fname = sprintf("%s%03d.sql", prefix, chunk++)
        outfile = fname
        print "BEGIN;"    > outfile
        print copy_header >> outfile
      }
      # write data line
      print >> outfile
      row++
    }
    END {
      if (outfile != "") {
        print "\\."       >> outfile
        print "COMMIT;"   >> outfile
        print "ANALYZE;"  >> outfile
        close(outfile)
      }
    }
  ' "$temp_copy_file"

  local count
  count=$(ls "$chunks_dir"/chunk_*.sql 2>/dev/null | wc -l)
  print_message success "Created $count chunk(s) in $chunks_dir"
  echo "$chunks_dir"
}




# ===
#
#
#
#
#
#

# Get FireAlert database URL
get_firealert_db_url() {
  if [[ "$IS_PRODUCTION" == true ]]; then
    print_message warning "Using PRODUCTION environment"
  else
    print_message info "Using DEVELOPMENT environment"
  fi

  if [[ -n "$DATABASE_URL" ]]; then
    db_url="$DATABASE_URL"
  else
    read -p "Enter the FireAlert ${ENVIRONMENT} PostgreSQL database URL: " db_url
  fi

  # Basic validation of the URL format
  if [[ ! "$db_url" =~ ^postgres(ql)?:// ]]; then
    print_message error "Invalid database URL scheme. Must be postgresql:// or postgres://"
    return 1
  fi

  print_message success "Database URL validated"
  echo "$db_url"
}

# Parse database URL components
parse_db_url() {
  local db_url=$1

  # Extract components from the URL
  local regex="postgres(ql)?://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)"

  if [[ $db_url =~ $regex ]]; then
    DB_USER="${BASH_REMATCH[2]}"
    DB_PASSWORD="${BASH_REMATCH[3]}"
    DB_HOST="${BASH_REMATCH[4]}"
    DB_PORT="${BASH_REMATCH[5]}"
    DB_NAME="${BASH_REMATCH[6]}"
    return 0
  else
    print_message error "Failed to parse database URL"
    return 1
  fi
}

# Backup the database
backup_database() {
  local db_url=$1

  if [[ "$IS_PRODUCTION" != true ]]; then
    print_message info "Skipping backup for non-production environment"
    return 0
  fi

  print_message info "Creating database backup..."

  # Parse the database URL
  parse_db_url "$db_url" || return 1

  # Create timestamp for backup filename
  local timestamp=$(date +"%Y%m%d_%H%M%S")
  BACKUP_PATH="${TEMP_DIR}/firealert_backup_${timestamp}.dump"

  # Export password for pg_dump
  export PGPASSWORD="$DB_PASSWORD"

  # Create backup
  pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -F c -f "$BACKUP_PATH" "$DB_NAME"

  if [[ $? -ne 0 ]]; then
    print_message error "Backup failed"
    unset PGPASSWORD
    return 1
  fi

  print_message success "Backup created: $(realpath "$BACKUP_PATH")"
  unset PGPASSWORD
  return 0
}






# ===
#
#





#
#
#
#


import_data() {
  local db_url=$1
  local chunks_dir="$TEMP_DIR/sql_chunks"
  local failed=0

  parse_db_url "$db_url"
  export PGPASSWORD="$DB_PASSWORD"

  print_message warning "Dropping GIST index…"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q \
    -c 'DROP INDEX IF EXISTS "ProtectedArea_geom_idx";'

  for file in "$chunks_dir"/chunk_*.sql; do
    print_message info "Importing $(basename "$file")…"
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
              --single-transaction -f "$file"; then
      print_message error "Failed on $file"
      failed=1
      break
    fi
  done

  if (( failed )); then
    print_message error "Import aborted."
    unset PGPASSWORD
    return 1
  fi

  print_message success "All chunks in. Rebuilding index…"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q <<SQL
CREATE INDEX IF NOT EXISTS "ProtectedArea_geom_idx"
  ON "ProtectedArea" USING GIST (geom);
VACUUM ANALYZE "ProtectedArea";
SQL

  unset PGPASSWORD
  print_message success "Import completed."
  return 0
}


# ===
#
#
#
#
#
#


# Clean up temporary files
cleanup() {
  print_message info "Cleaning up temporary files..."

  # Don't delete the entire tmp directory, just the extracted files
  if [[ -d "$EXTRACT_DIR" ]]; then
    rm -rf "${EXTRACT_DIR:?}"/*
    print_message success "Extracted files cleaned up"
  fi

  # Only remove temporary SQL files, not the final output
  rm -f "${TEMP_DIR}/temp_*.sql" "${TEMP_DIR}/modified_*.sql" "${TEMP_DIR}/shapefiles.txt"

  print_message success "Temporary files cleaned up"
}


# Main function
main() {
  print_message info "=== natural_protected_areas → FireAlert sync ==="
  local T0=$SECONDS

  parse_args "$@" || exit 1
  check_environment || exit 1
  prepare_temp_dir

  local zipfile=$(download_dataset)      || exit 1
  local extractdir=$(extract_archives "$zipfile") || exit 1
  local shp_list=$(find_shapefiles "$extractdir")  || exit 1

  local chunks
  chunks=$(convert_shapefiles_to_sql "$shp_list") || exit 1

  local dburl
  dburl=$(get_firealert_db_url) || exit 1

  if [[ "$IS_PRODUCTION" == true ]]; then
    backup_database "$dburl"
  fi

  import_data "$dburl" || exit 1
  cleanup

  print_message info "Total time: $(format_duration $(( SECONDS - T0 )))"
  print_message success "Done."
}




# Execute main function
main "$@"
