# GeoSlices - Global Data Fetching

Given the volume of data, we have sliced the world into 8 manageable regions that allow us to distribute the load on the server and avoid overwhelming it with one big request when comparing the data.

## Geographic Slices

The world is divided into eight horizontal slices based on latitude. Each slice is represented as a bounding box, extending from -180 to 180 degrees longitude, and between two latitudes. Here are the details of the slices:

| Slice Name | Bounding Box     | Description |
| :--------- | :--------------- | :---------- |
| Slice 10    | "-180,-90,180,-30" | Covers the Southernmost regions of the world including the majority of Antarctica and parts of Southern South America. |
| Slice 21    | "-180,-30,-60,-15" | Covers left part of mid-lower South America |
| Slice 22    | "-60,-30,30,-15" | Covers right part of mid-lower South America, and left part of Lower Africa. |
| Slice 23    | "30,-30,180,-15" | Covers right part of Lower Africa, and upper part of Australia |
| Slice 31    | "-180,-15,-60,0"   | Covers left part of Mid-upper South America |
| Slice 32    | "-60,-15,30,0"   | Covers right part of Mid-upper South America, and left part of lower-mid Africa. |
| Slice 33    | "30,-15,180,0"   | Covers right part of lower-mid Africa, and Papua New Guinea and parts of Indonesia. |
| Slice 41    | "-180,0,-60,15"    | Covers left part of Upper South America|
| Slice 42    | "-60,0,30,15"    | Covers right part of Upper South America and left part of Upper-mid Africa |
| Slice 43    | "30,0,180,15"    | Covers right part of Upper-mid Africa, and Lower South Asia. |
| Slice 51    | "-180,15,-60,30"   | Covers Lower North America, containing Mexico and Cuba. |
| Slice 52    | "-60,15,30,30"   | Covers left part of Upper Africa. |
| Slice 53    | "30,15,180,30"   | Covers right part of Upper Africa, lower part of middle east, and Upper South Asia |
| Slice 61    | "-180,30,-60,45"   | Covers Mid North America, covering most of the United States. |
| Slice 62    | "-60,30,30,45"   | Covers lower western Europe. |
| Slice 63    | "30,30,180,45"   | Covers upper part of middle east, and middle Asia. |
| Slice 70    | "-180,45,180,60"   | Covers Northern parts of United States, Europe, Asia, and the majority of Russia. |
| Slice 80    | "-180,60,180,90"   | Covers the Northernmost regions of the world including Greenland, Arctic Ocean, and Northern Russia. |

With site size limitation of 1 million hectares, a monitored site can belong to max two Geo Slices.

These slices ensure we can evenly distribute our API calls to NASA's FIRMS API to fetch the fire alerts data in a controlled manner. Note that this slicing method is designed to balance server load, and each slice will not necessarily contain an equal amount of land area.

[image:geoslice.png]

Check the `geoslice.geojson` file for slices.

## Note
GeoJSON uses a coordinate order of longitude, latitude (and elevation, if available). This might seem counterintuitive, especially since we often refer to locations as "lat, lon" in conversation, but it's in line with the x, y (and z) order used in mathematics and most programming languages.

In the context of a bounding box (bbox), the coordinate values are provided in the order of longitude and then latitude. The bbox itself consists of four values: [minLon, minLat, maxLon, maxLat], representing the lower-left corner (minimum longitude and latitude) and the upper-right corner (maximum longitude and latitude) of the box.



