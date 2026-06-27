import React, { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function MapView({ oracleInsights, viewMode = 'map', defaultCenter }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const hotspotsRef = useRef([]);
  const infoWindowRef = useRef(null);

  const [issues, setIssues] = useState([]);

  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.visualization) {
      initMap();
      return;
    }

    if (document.getElementById('google-maps-script')) {
      const check = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.visualization) {
          clearInterval(check);
          initMap();
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    // Add libraries=visualization,places
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&libraries=visualization,places`;
    script.async = true;
    script.onload = () => {
      setTimeout(initMap, 100);
    };
    document.head.appendChild(script);
  }, []);

  // Live Issues Listener
  useEffect(() => {
    const q = query(
      collection(db, 'issues'),
      where('duplicate_of', '==', null), // per user request
      orderBy('created_at', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveIssues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIssues(liveIssues);

      // Animate new markers
      if (mapInstanceRef.current && window.google && window.google.maps) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added' && viewMode === 'map') {
            const newIssue = { id: change.doc.id, ...change.doc.data() };
            addMarkerWithAnimation(newIssue, mapInstanceRef.current);
          }
        });
      }
    });

    return () => unsubscribe();
  }, [viewMode]);

  // Re-draw when viewMode, issues, or oracleInsights change
  useEffect(() => {
    if (mapInstanceRef.current && window.google && window.google.maps) {
      clearMarkers();
      drawMarkers(mapInstanceRef.current, issues);

      if (oracleInsights) {
        drawHotspots(mapInstanceRef.current, oracleInsights.predicted_hotspots || []);
      }
    }
  }, [issues, oracleInsights, viewMode]);

  function getSeverity(issue) {
    return issue.analysis?.severity_score ?? issue.severity_score ?? 0;
  }

  function getMarkerColor(severity) {
    if (severity >= 5) return '#d93025';
    if (severity >= 4) return '#f57c00';
    if (severity >= 3) return '#f9ab00';
    return '#188038';
  }

  function clearMarkers() {
    Object.values(markersRef.current).forEach(m => m.setMap(null));
    markersRef.current = {};
  }


  function getSvgMarker(severity, isMega, impactCount) {
    const baseScale = isMega ? 12 + Math.min((impactCount || 1) * 1.5, 15) : 10;
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: getMarkerColor(severity),
      fillOpacity: 1,
      strokeColor: isMega ? '#ffd700' : '#ffffff',
      strokeWeight: isMega ? 3 : 2,
      scale: baseScale,
    };
  }

  function addMarkerWithAnimation(issue, map) {
    if (!issue.location?.lat || !map) return;
    if (markersRef.current[issue.id]) return; // already exists

    const severity = getSeverity(issue);
    const isMega = (issue.impact_count || 1) > 1;

    const marker = new window.google.maps.Marker({
      position: { lat: Number(issue.location.lat), lng: Number(issue.location.lng) },
      map: map,
      icon: getSvgMarker(severity, isMega, issue.impact_count),
      animation: window.google.maps.Animation.DROP,
      title: issue.analysis?.category || issue.category || 'Civic Issue',
      label: isMega ? {
        text: String(issue.impact_count),
        color: 'white',
        fontSize: '12px',
        fontWeight: 'bold'
      } : null,
    });

    marker.addListener('click', () => showInfoWindow(issue, marker, map));
    markersRef.current[issue.id] = marker;
  }

  function drawMarkers(map, issueList) {
    clearMarkers();

    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
    infoWindowRef.current = new window.google.maps.InfoWindow();

    const validIssues = issueList.filter(
      i => i.location?.lat != null && i.location?.lng != null
    );

    validIssues.forEach(issue => {
      addMarkerWithAnimation(issue, map);
    });
  }

  function showInfoWindow(issue, marker, map) {
    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }
    const category = issue.analysis?.category || issue.category || 'Civic Issue';
    const severityScore = getSeverity(issue);
    const desc = issue.analysis?.ai_description || issue.ai_description || '';
    const department = issue.routing?.assigned_agency || issue.department || 'Unassigned';
    const issueId = issue.id;

    infoWindowRef.current.setContent(`
      <div style="max-width:220px;font-family:sans-serif;line-height:1.5">
        <b style="font-size:14px">${category}</b> — Severity ${severityScore}/5<br/>
        <span style="font-size:12px;color:#333">${desc.substring(0, 80)}${desc.length > 80 ? '…' : ''}</span><br/>
        <span style="color:#666;font-size:11px">${department}</span><br/>
        <a href="/issues/${issueId}" style="color:#1a73e8;font-size:12px;font-weight:600">View Report →</a>
      </div>
    `);
    infoWindowRef.current.open(map, marker);
  }

  function drawHotspots(map, hotspots) {
    // Clear old hotspots
    hotspotsRef.current.forEach(h => h.setMap(null));
    hotspotsRef.current = [];

    hotspots.forEach(hotspot => {
      if (hotspot.approximate_lat && hotspot.approximate_lng) {
        const circle = new window.google.maps.Circle({
          strokeColor: '#FF0000',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#FF0000',
          fillOpacity: 0.35,
          map,
          center: { lat: Number(hotspot.approximate_lat), lng: Number(hotspot.approximate_lng) },
          radius: hotspot.confidence === 'High' ? 400 : hotspot.confidence === 'Medium' ? 800 : 1200,
        });

        circle.addListener('click', (e) => {
          if (!infoWindowRef.current) infoWindowRef.current = new window.google.maps.InfoWindow();
          infoWindowRef.current.setContent(`
            <div style="max-width:220px;font-family:sans-serif;line-height:1.5">
              <span style="font-size:10px;font-weight:bold;color:#d93025;letter-spacing:1px">PREDICTED HOTSPOT</span><br/>
              <b style="font-size:14px">${hotspot.area}</b><br/>
              <span style="font-size:12px;color:#333">Predicted Issue: <b>${hotspot.predicted_issue_type}</b></span><br/>
              <span style="color:#666;font-size:11px">Confidence: ${hotspot.confidence}</span>
            </div>
          `);
          infoWindowRef.current.setPosition(e.latLng);
          infoWindowRef.current.open(map);
        });

        hotspotsRef.current.push(circle);
      }
    });
  }

  function initMap() {
    if (!mapRef.current) return;

    const center = defaultCenter || { lat: 22.7196, lng: 75.8577 };

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: defaultCenter ? 13 : 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    });

    mapInstanceRef.current = map;
    drawMarkers(map, issues);

    if (oracleInsights) {
      drawHotspots(map, oracleInsights.predicted_hotspots || []);
    }
  }

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-md border border-gray-100 flex items-center gap-2">
        <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
        <span className="text-xs font-bold text-gray-700 tracking-wide uppercase">Live</span>
      </div>
      <div
        ref={mapRef}
        id="civic-map"
        style={{ height: '600px', width: '100%', borderRadius: '16px', overflow: 'hidden' }}
        className="shadow-lg border border-gray-100"
      />
    </div>
  );
}
