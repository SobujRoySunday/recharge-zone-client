import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.js";
import "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const MapView = () => {
  const map = useRef(null);

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
  }, []);

  return (
    <main>
      <div id="map"></div>
    </main>
  );
};

export default MapView;
