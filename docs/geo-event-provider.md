# GeoSlices - Global Data Fetching

Given the volume of data, we have sliced the world into 8 manageable regions that allow us to distribute the load on the server and avoid overwhelming it with one big request when comparing the data.

## Geographic Slices

The world is divided into eight horizontal slices based on latitude. Each slice is represented as a bounding box, extending from -180 to 180 degrees longitude, and between two latitudes. Here are the details of the slices:

| Slice Name | Bounding Box     | Description |
| :--------- | :--------------- | :---------- |
| Slice 10    | "-180,-90,180,-30" | Covers the Southernmost regions of the world including the majority of Antarctica and parts of Southern South America. |
| Slice 21    | "-180,-30,-30,-15" | Covers Mid-lower South America, containing upper Chile, Paraguay, lower Brazil, upper Argentina, lower Bolivia. |
| Slice 22    | "-30,-30,60,-15" | Covers Lower Africa, including upper South Africa, Namibia, Botswana, Zimbabwe, parts of Madagascar. |
| Slice 23    | "60,-30,180,-15" | Covers Upper part of Australia |
| Slice 31    | "-180,-15,-30,0"   | Covers Mid-upper South America, covering upper Brazil, Peru, upper Bolivia. |
| Slice 32    | "-30,-15,60,0"   | Covers Lower-mid Africa, with parts of Angola, Zambia, Malawi, Tanzania, Kenya, Democratic Republic of the Congo, Gabon, Republic of the Congo. |
| Slice 33    | "60,-15,180,0"   | Covers Papua New Guinea and parts of Indonesia. |
| Slice 41    | "-180,0,-30,15"    | Covers Upper South America, containing upper Colombia, Venezuela, Guyana, Suriname, Panama, Costa Rica, Nicaragua. |
| Slice 42    | "-30,0,60,15"    | Covers Upper-mid Africa, covering Nigeria, Cameroon, parts of Sudan, Ethiopia, Somalia. |
| Slice 43    | "60,0,180,15"    | Covers Lower South Asia, containing Maldives, Sri Lanka, parts of Malaysia, Cambodia, Philippines, Indonesia. |
| Slice 51    | "-180,15,-30,30"   | Covers Lower North America, containing Mexico and Cuba. |
| Slice 52    | "-30,15,60,30"   | Covers Upper Africa, with parts of Egypt, Libya, Niger, Mauritania, Saudi Arabia, Oman, and Yemen. |
| Slice 53    | "60,15,180,30"   | Covers Upper South Asia, covering Nepal, Bangladesh, parts of Pakistan, China, and India. |
| Slice 61    | "-180,30,-30,45"   | Covers Mid North America, covering most of the United States. |
| Slice 62    | "-30,30,60,45"   | Covers Lower western Europe, containing Spain, Italy, Turkey, parts of Italy, Iran, and Iraq. |
| Slice 63    | "60,30,180,45"   | Covers Mid Asia, covering most of China, Japan, and parts of Afghanistan. |
| Slice 70    | "-180,45,180,60"   | Covers Northern parts of United States, Europe, Asia, and the majority of Russia. |
| Slice 80    | "-180,60,180,90"   | Covers the Northernmost regions of the world including Greenland, Arctic Ocean, and Northern Russia. |

With site size limitation of 1 million hectares, a monitored site can belong to max two Geo Slices.

These slices ensure we can evenly distribute our API calls to NASA's FIRMS API to fetch the fire alerts data in a controlled manner. Note that this slicing method is designed to balance server load, and each slice will not necessarily contain an equal amount of land area.

[image:geoslice.png]

Check the `geoslice.geojson` file for slices.

## Note
GeoJSON uses a coordinate order of longitude, latitude (and elevation, if available). This might seem counterintuitive, especially since we often refer to locations as "lat, lon" in conversation, but it's in line with the x, y (and z) order used in mathematics and most programming languages.

In the context of a bounding box (bbox), the coordinate values are provided in the order of longitude and then latitude. The bbox itself consists of four values: [minLon, minLat, maxLon, maxLat], representing the lower-left corner (minimum longitude and latitude) and the upper-right corner (maximum longitude and latitude) of the box.



