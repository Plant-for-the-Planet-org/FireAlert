If there are 2+ Site Incident for (in proximity) a Site Alert then Current system - Just Associates with the one whose center (or centroid) is nearest.

## Now we are Introducing Incident Merging

In the above case instead of associating with the neares - Create another Site Incident around the Site Alert. Consider this Newly created Site Incident as Child Site Incident & former ones are Parent Site Incident. And this Child Site Incident gets linked with the Parent Site Incident through relatedIncidentId column (This need to be created.)
Any further Site Alert would be checked for vicinity of all Parent & Child Site Incident and if found in vicinity then it would be associated with the Suitable Child Site Incidents.
Usually wildfires do propageate & this techniques just follows the real world scenario.
Now extending the naming convention of parent & child analogy - there can be following cases -

1. 2 or more Parent Site Incidents will cause 1 Child Site Incident
2. 2 or more combination of Parent & Child Incident will cause 1 Child Site Incident (_making old child a parent itself_)

## To resolve Incidents

If there are any Incident that has passed 6 hours (INCIDENT_RESOLUTION_HOURS) without any new Site Alert in vicinity then previously it was considered as resolved. But now we will check if there are any related Incident (through relatedIncidentId) & check if they also did not have any recent fires wihtin INCIDENT_RESOLUTION_HOURS. So going forward not only Parent - But Child Incident should also be resolved in order to Parent Incident to resolve.

## Edge cases -

1. Notifications will not have any changes as of now. But If any Parent Site Incident has review Status STOP_ALERT then Child Site Incident should also have the same status. Thus No Notification will be sent for Child Site Incident. (Neither Start or End Incident Notifications, nor any Alert Notifications)

## Testing

Incident 1

```
{
  "type": "Feature",
  "properties": {},
  "geometry": {
    "type": "Point",
    "coordinates": [
      77.3851683,
      23.237649
    ]
  }
}
```

```
{
  "type": "Feature",
  "properties": {},
  "geometry": {
    "type": "Point",
    "coordinates": [
      77.3930248,
      23.238377
    ]
  }
}
```

Incident 2

```
{
  "type": "Feature",
  "properties": {},
  "geometry": {
    "type": "Point",
    "coordinates": [
      77.4348963,
      23.2333974
    ]
  }
}
```

```
{
  "type": "Feature",
  "properties": {},
  "geometry": {
    "type": "Point",
    "coordinates": [
      77.423994,
      23.2329278
    ]
  }
}
```

```
{
  "type": "Feature",
  "properties": {},
  "geometry": {
    "type": "Point",
    "coordinates": [
      77.4148045,
      23.2342626
    ]
  }
}
```

Potential Merger Incidents

```
{
  "type": "Feature",
  "properties": {},
  "geometry": {
    "type": "Point",
    "coordinates": [
      77.4117892,
      23.2410528
    ]
  }
}
```

Post Merger Fires

```
{
  "type": "Feature",
  "properties": {},
  "geometry": {
    "type": "Point",
    "coordinates": [
      77.4166865,
      23.2520135
    ]
  }
}
```
