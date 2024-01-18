import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.js";
import "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const MapView = () => {
  const map = useRef(null);
  const [evStations, setEvStations] = useState([]);
  const energyConsumptionRate = 0.2;
  const [chargeConsumption, setChargeConsumption] = useState(0);

  function calculateConsumption(start, destination) {
    const distance = calculateDistance(start, destination);
    const consumption = distance * energyConsumptionRate;
    setChargeConsumption(consumption.toFixed(2));
    console.log(`chargeConsumption: ${consumption.toFixed(2)}`);
  }

  function calculateDistance(point1, point2) {
    const toRadians = (angle) => angle * (Math.PI / 180);

    const lat1 = point1[1];
    const lon1 = point1[0];
    const lat2 = point2[1];
    const lon2 = point2[0];

    const R = 6371; // Earth radius in kilometers

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in kilometers

    return distance;
  }

  function fetchEVStations(userLocation) {
    const keyword = "EV Station";
    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${keyword}.json?proximity=${userLocation[0]},${userLocation[1]}&access_token=${mapboxgl.accessToken}`
    )
      .then((response) => response.json())
      .then((data) => {
        const evStationsLocal = data.features.map((feature) => ({
          name: feature.text,
          coordinates: feature.center,
        }));
        setEvStations(evStationsLocal);

        evStationsLocal.forEach((station) => {
          const marker = new mapboxgl.Marker()
            .setLngLat(station.coordinates)
            .setPopup(new mapboxgl.Popup().setText(station.name))
            .addTo(map.current);

          // Attach click event to the marker
          marker
            .getElement()
            .addEventListener("click", () =>
              calculateConsumption(userLocation, station.coordinates)
            );
        });
      })
      .catch((error) => console.error("Error fetching EV stations:", error));
  }

  useEffect(() => {
    // initialize map only once
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/streets-v12",
      center: [0, 0],
      zoom: 15,
      attributionControl: false,
    });

    // Adding necessary controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    // Geolocation control
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
    });
    map.current.addControl(geolocate);
    // Directions Control
    const directions = new MapboxDirections({
      accessToken: mapboxgl.accessToken,
      unit: "metric",
      profile: "mapbox/driving-traffic",
    });
    map.current.addControl(directions, "top-left");

    // on geolocate event handler
    geolocate.on("geolocate", (event) => {
      const userLocation = [event.coords.longitude, event.coords.latitude];
      fetchEVStations(userLocation);
      directions.setOrigin(userLocation);
    });

    // on map load event handler
    map.current.on("load", () => {
      geolocate.trigger();
    });
  });

  return (
    <main>
      <div id="map"></div>
      <div id="destinationSelector">
        <label htmlFor="destination">EV Charging Station:</label>
        <select id="destination" defaultValue="">
          <option value="" disabled>
            Select an EV station
          </option>
          {evStations
            ? evStations.map((station) => (
                <option key={station.coordinates} value={station.coordinates}>
                  {station.name}
                </option>
              ))
            : null}
        </select>
      </div>
      <div id="chargeInfo">
        Estimated Charge Consumption:{" "}
        <span id="chargeConsumption">{chargeConsumption}</span> kWh
      </div>
    </main>
  );
};

export default MapView;
