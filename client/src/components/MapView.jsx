import React, { useEffect, useRef } from 'react';

export default function MapView({ issues }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);

  useEffect(() => {
    if (window.google && window.google.maps) {
      initMap();
      return;
    }

    // Avoid duplicate script injection
    if (document.getElementById('google-maps-script')) {
      const check = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(check);
          initMap();
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}`;
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);
  }, []);

  // Re-draw markers when issues change and map is already ready
  useEffect(() => {
    if (mapInstanceRef.current && window.google && window.google.maps) {
      drawMarkers(mapInstanceRef.current, issues);
    }
  }, [issues]);

  function getSeverity(issue) {
    return issue.analysis?.severity_score ?? issue.severity_score ?? 0;
  }

  function getMarkerColor(severity) {
    if (severity >= 5) return '#d93025';
    if (severity >= 4) return '#f57c00';
    if (severity >= 3) return '#f9ab00';
    return '#188038';
  }

  function drawMarkers(map, issueList) {
    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
    infoWindowRef.current = new window.google.maps.InfoWindow();

    const validIssues = issueList.filter(
      i => i.location?.lat != null && i.location?.lng != null
    );

    validIssues.forEach(issue => {
      const severity = getSeverity(issue);
      const markerColor = getMarkerColor(severity);

      const svgMarker = {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: markerColor,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 10,
      };

      const marker = new window.google.maps.Marker({
        position: { lat: Number(issue.location.lat), lng: Number(issue.location.lng) },
        map,
        icon: svgMarker,
        title: issue.analysis?.category || issue.category || 'Civic Issue',
      });

      const category = issue.analysis?.category || issue.category || 'Civic Issue';
      const severityScore = severity;
      const desc = issue.analysis?.ai_description || issue.ai_description || '';
      const department = issue.routing?.assigned_agency || issue.department || 'Unassigned';
      const issueId = issue.id;

      marker.addListener('click', () => {
        infoWindowRef.current.setContent(`
          <div style="max-width:220px;font-family:sans-serif;line-height:1.5">
            <b style="font-size:14px">${category}</b> — Severity ${severityScore}/5<br/>
            <span style="font-size:12px;color:#333">${desc.substring(0, 80)}${desc.length > 80 ? '…' : ''}</span><br/>
            <span style="color:#666;font-size:11px">${department}</span><br/>
            <a href="/issues/${issueId}" style="color:#1a73e8;font-size:12px;font-weight:600">View Report →</a>
          </div>
        `);
        infoWindowRef.current.open(map, marker);
      });

      markersRef.current.push(marker);
    });
  }

  function initMap() {
    if (!mapRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 22.7196, lng: 75.8577 },
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    });

    mapInstanceRef.current = map;
    drawMarkers(map, issues);
  }

  return (
    <div
      ref={mapRef}
      id="civic-map"
      style={{ height: '600px', width: '100%', borderRadius: '16px', overflow: 'hidden' }}
      className="shadow-lg border border-gray-100"
    />
  );
}
