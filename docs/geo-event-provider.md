# GeoSlices - Global Data Fetching

Given the volume of data, we have sliced the world into 8 manageable regions that allow us to distribute the load on the server and avoid overwhelming it with one big request when comparing the data.

## Geographic Slices

The world is divided into eight horizontal slices based on latitude. Each slice is represented as a bounding box, extending from -180 to 180 degrees longitude, and between two latitudes. Here are the details of the slices:

| Slice Name | Bounding Box     | Description |
| :--------- | :--------------- | :---------- |
| Slice 1    | "-180,-90,180,-30" | Covers the Southernmost regions of the world including the majority of Antarctica and parts of Southern South America. |
| Slice 2    | "-180,-30,180,-15" | Covers parts of Southern South America, South Africa and Australia. |
| Slice 3    | "-180,-15,180,0"   | Covers parts of South America, Africa and Australia. |
| Slice 4    | "-180,0,180,15"    | Covers parts of South America, Africa, Asia and northern Australia. |
| Slice 5    | "-180,15,180,30"   | Covers parts of United States, Europe, Asia, North Africa and the northern tip of Australia. |
| Slice 6    | "-180,30,180,45"   | Covers parts of United States, Europe, Asia and North Africa. |
| Slice 7    | "-180,45,180,60"   | Covers Northern parts of United States, Europe, Asia, and the majority of Russia. |
| Slice 8    | "-180,60,180,90"   | Covers the Northernmost regions of the world including Greenland, Arctic Ocean, and Northern Russia. |

With site size limitation of 1 million hectares, a monitored site can belong to max two Geo Slices.

These slices ensure we can evenly distribute our API calls to NASA's FIRMS API to fetch the fire alerts data in a controlled manner. Note that this slicing method is designed to balance server load, and each slice will not necessarily contain an equal amount of land area.

[image:geoslice.png]

Check the `geoslice.geojson` file for slices.

## Note
GeoJSON uses a coordinate order of longitude, latitude (and elevation, if available). This might seem counterintuitive, especially since we often refer to locations as "lat, lon" in conversation, but it's in line with the x, y (and z) order used in mathematics and most programming languages.

In the context of a bounding box (bbox), the coordinate values are provided in the order of longitude and then latitude. The bbox itself consists of four values: [minLon, minLat, maxLon, maxLat], representing the lower-left corner (minimum longitude and latitude) and the upper-right corner (maximum longitude and latitude) of the box.



