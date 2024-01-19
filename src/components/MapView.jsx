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
  const [batteryLevel, setBatteryLevel] = useState(30);
  const geolocate = useRef();
  const directions = useRef();
  const socket = useRef();
  const [chargingTime, setChargingTime] = useState("");
  const [messageElement, setMessageElement] = useState("");

  function emergencyCall() {
    // Get the user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const emergencyMessage = "Emergency! Please check the situation.";

          // Create an object with text and location
          const messageObject = {
            text: emergencyMessage,
            location: `Lat: ${position.coords.latitude}, Lng: ${position.coords.longitude}`,
          };

          // Send the message object to the server
          socket.current.send(JSON.stringify(messageObject));
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    } else {
      console.error("Geolocation is not supported in this browser.");
    }
  }

  useEffect(() => {
    try {
      socket.current = new WebSocket(process.env.REACT_APP_BACKEND_API);

      socket.current.addEventListener("open", (event) => {
        console.log("WebSocket connection opened:", event);
      });

      socket.current.addEventListener("message", (event) => {
        console.log("Message from server:", event.data);

        // Parse the message as JSON
        try {
          const messageData = JSON.parse(event.data);

          setMessageElement(
            `Message: ${messageData.text}, Location: ${messageData.location}`
          );

          setTimeout(() => {
            setMessageElement("");
          }, 300000);
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      });

      socket.current.addEventListener("error", (error) => {
        console.error("WebSocket error:", error);
      });

      socket.current.addEventListener("close", (event) => {
        console.log("WebSocket connection closed:", event);
      });
    } catch (error) {
      console.error(error);
    }
  });

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
    geolocate.current = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
    });
    map.current.addControl(geolocate.current);
    // Directions Control
    directions.current = new MapboxDirections({
      accessToken: mapboxgl.accessToken,
      unit: "metric",
      profile: "mapbox/driving-traffic",
    });
    map.current.addControl(directions.current, "top-left");

    // on geolocate event handler
    geolocate.current.on("geolocate", (event) => {
      const userLocation = [event.coords.longitude, event.coords.latitude];
      fetchEVStations(userLocation);
      directions.current.setOrigin(userLocation);
    });

    // on map load event handler
    map.current.on("load", () => {
      geolocate.current.trigger();
    });

    // battery status
    navigator.getBattery().then((battery) => {
      function updateBatteryState() {
        console.log(battery);
        setBatteryLevel(battery.level * 100);
        if (battery.charging) {
          setChargingTime("Charging...");
        } else {
          if (parseInt(battery.dischargingTime)) {
            let hr = parseInt(battery.dischargingTime / 3600);
            let min = parseInt(battery.dischargingTime / 60 - hr * 60);
            setChargingTime(`${hr}hr ${min}mins remaining`);
          } else {
            setChargingTime(battery.dischargingTime);
          }
        }
      }

      updateBatteryState();

      battery.addEventListener("chargingchange", () => {
        updateBatteryState();
      });

      battery.addEventListener("levelchange", () => {
        updateBatteryState();
      });

      battery.addEventListener("ondischargingtimechange", () => {
        updateBatteryState();
      });
    });
  });

  useEffect(() => {
    if (batteryLevel < 30) {
      geolocate.current.trigger();
    }
  }, [batteryLevel]);

  function handleEvChange() {
    const destinationSelector = document.getElementById("destination");
    const selectedDestination = destinationSelector.value;
    if (selectedDestination) {
      const destinationCoordinates = JSON.parse(selectedDestination);
      directions.current.setDestination(destinationCoordinates);
    }
  }

  return (
    <main>
      <div id="map"></div>
      <div id="batteryStatus">
        Battery Status: <span id="batteryPercentage">{batteryLevel}</span>
      </div>
      <div id="destinationSelector">
        <label htmlFor="destination">EV Charging Station:</label>
        <select id="destination" defaultValue="" onChange={handleEvChange}>
          <option value="" disabled>
            Select an EV station
          </option>
          {evStations
            ? evStations.map((station) => (
                <option
                  key={station.coordinates}
                  value={JSON.stringify(station.coordinates)}
                >
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
      <div id="charging-time">{chargingTime}</div>
      <button
        onClick={emergencyCall}
        id="emergencyButton"
        className="my-custom-selector"
      >
        Emergency Signal
      </button>
      {messageElement === "" ? null : (
        <div id="messageContainer" className="my-custom-selector">
          {messageElement}
        </div>
      )}
    </main>
  );
};

export default MapView;
