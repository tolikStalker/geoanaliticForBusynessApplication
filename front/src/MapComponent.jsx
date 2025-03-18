import React, { useEffect, useRef } from "react";

export default function MapComponent() {
  const mapRef = useRef(null);

  useEffect(() => {
    fetch("http://localhost:5000/map")
      .then((response) => response.text())
      .then((html) => {
        if (mapRef.current) {
          mapRef.current.innerHTML = html;
        }
      });
  }, []);

  return <div ref={mapRef} style={{ width: "100%", height: "600px" }} />;
}