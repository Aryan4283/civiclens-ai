import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UploadZone from '../components/UploadZone';
import { analyzeMedia, submitIssue, analyzeVoice } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getCityCoords } from '../utils/cityCoords';

export default function ReportIssue() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const [mediaBase64, setMediaBase64] = useState('');
  const [mediaType, setMediaType]     = useState('');
  const [analysis, setAnalysis]       = useState(null);

  const [userDescription, setUserDescription] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [address, setAddress] = useState('');
  const [locState, setLocState] = useState((userProfile && userProfile.state) || '');
  const [locCity, setLocCity]   = useState((userProfile && userProfile.city)  || '');
  const [locArea, setLocArea] = useState('');
  const [locLandmark, setLocLandmark] = useState('');
  const [locating, setLocating] = useState(false);
  const [submittedId, setSubmittedId] = useState('');
  const [isClustered, setIsClustered] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = React.useRef(null);
  const audioChunksRef = React.useRef([]);

  const mapContainerRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const markerInstanceRef = React.useRef(null);

  React.useEffect(() => {
    if (step === 2) {
      if (window.google && window.google.maps) {
        initReportMap();
        return;
      }
      if (document.getElementById('google-maps-script')) {
        const check = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(check);
            initReportMap();
          }
        }, 100);
        return;
      }
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&libraries=visualization,places`;
      script.async = true;
      script.onload = initReportMap;
      document.head.appendChild(script);
    }
  }, [step]);

  const initReportMap = () => {
    if (!mapContainerRef.current) return;

    // Center on: GPS coords > user's registered city > Indore default
    const userCityCoords = getCityCoords((userProfile && userProfile.city) || '');
    const initialLat = latitude || (userCityCoords && userCityCoords.lat) || 22.7196;
    const initialLng = longitude || (userCityCoords && userCityCoords.lng) || 75.8577;
    const center = { lat: Number(initialLat), lng: Number(initialLng) };

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center,
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    mapInstanceRef.current = map;

    const marker = new window.google.maps.Marker({
      position: center,
      map,
      draggable: true,
      title: 'Drag or click map to move',
    });

    markerInstanceRef.current = marker;

    // Click map to move marker
    map.addListener('click', (e) => {
      const clickedLat = e.latLng.lat();
      const clickedLng = e.latLng.lng();
      updateMarkerPosition(clickedLat, clickedLng);
    });

    // Drag release
    marker.addListener('dragend', () => {
      const position = marker.getPosition();
      updateMarkerPosition(position.lat(), position.lng());
    });

    // Auto-detect user location silently if currently unset
    if (latitude === null || longitude === null) {
      detectLocation(true);
    }
  };

  const updateMarkerPosition = (lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);

    if (markerInstanceRef.current) {
      markerInstanceRef.current.setPosition({ lat, lng });
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat, lng });
    }

    reverseGeocode(lat, lng);
  };

  const reverseGeocode = (lat, lng) => {
    if (!window.google || !window.google.maps) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        setAddress(results[0].formatted_address);
      } else {
        console.warn('Reverse geocode failed:', status);
      }
    });
  };

  const geocodeAddress = (addressQueries) => {
    if (!addressQueries || !addressQueries.length || !window.google || !window.google.maps) return;
    const geocoder = new window.google.maps.Geocoder();
    
    const tryGeocode = (index) => {
      if (index >= addressQueries.length) {
        alert('Could not find that location. Please try clicking directly on the map or entering a valid area.');
        return;
      }
      geocoder.geocode({ address: addressQueries[index] }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const loc = results[0].geometry.location;
          const lat = loc.lat();
          const lng = loc.lng();
          setLatitude(lat);
          setLongitude(lng);
          setAddress(results[0].formatted_address);

          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter({ lat, lng });
            mapInstanceRef.current.setZoom(15);
          }
          if (markerInstanceRef.current) {
            markerInstanceRef.current.setPosition({ lat, lng });
          }
        } else {
          console.warn(`Geocode failed for query: "${addressQueries[index]}" with status: ${status}`);
          tryGeocode(index + 1);
        }
      });
    };
    
    tryGeocode(0);
  };

  const handleUploadComplete = async (base64, type) => {
    if (!base64) {
      setMediaBase64('');
      setMediaType('');
      setAnalysis(null);
      return;
    }

    setMediaBase64(base64);
    setMediaType(type);

    setLoading(true);
    setLoadingMessage('AI is analyzing your report...');
    try {
      const response = await analyzeMedia(base64, type);
      if (response && response.success) {
        setAnalysis(response.analysis);
        setUserDescription('');
        setStep(2);
      } else {
        throw new Error('Analysis response unsuccessful');
      }
    } catch (err) {
      console.error('Error during AI analysis:', err);
      setAnalysis({
        category: 'other',
        severity_score: 3,
        ai_description: 'Failed to analyze media automatically. Please describe the issue manually.',
        suggested_department: 'Municipal Corporation',
        is_urgent: false,
        hazard_tags: []
      });
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result;
          setMediaBase64(base64Audio);
          setMediaType('audio');

          setLoading(true);
          setLoadingMessage('AI is analyzing your voice report...');
          try {
            const response = await analyzeVoice(base64Audio);
            if (response && response.success) {
              setAnalysis(response.analysis);
              setUserDescription('');
              setStep(2);
            } else {
              throw new Error('Voice analysis response unsuccessful');
            }
          } catch (err) {
            console.error('Error during AI voice analysis:', err);
            setAnalysis({
              category: 'other',
              severity_score: 3,
              ai_description: 'Failed to analyze voice automatically. Please describe the issue manually.',
              suggested_department: 'Municipal Corporation',
              is_urgent: false,
              hazard_tags: []
            });
            setStep(2);
          } finally {
            setLoading(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const detectLocation = (isAuto = false) => {
    if (!navigator.geolocation) {
      if (!isAuto) alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setLocating(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng });
          mapInstanceRef.current.setZoom(15);
        }
        if (markerInstanceRef.current) {
          markerInstanceRef.current.setPosition({ lat, lng });
        }
        reverseGeocode(lat, lng);
      },
      (error) => {
        console.error('Error getting location:', error);
        if (!isAuto) alert('Unable to retrieve location. Please input address manually.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mediaBase64) return;

    setLoading(true);
    setLoadingMessage('Submitting report to authorities...');

    const issueData = {
      mediaBase64,
      mediaType,
      analysis: {
        category: analysis?.category || 'other',
        severity_score: analysis?.severity_score || 3,
        ai_description: analysis?.ai_description || '',
        suggested_department: analysis?.suggested_department || 'Municipal Corporation',
        is_urgent: analysis?.is_urgent || false,
        hazard_tags: analysis?.hazard_tags || []
      },
      user_description: userDescription,
      location: {
        lat: latitude,
        lng: longitude,
        address,
        city: userProfile?.city || '',
        state: userProfile?.state || ''
      }
    };

    try {
      const data = await submitIssue(issueData);
      setSubmittedId(data.issueId);
      if (data.clustered) {
        setIsClustered(true);
      } else {
        setIsClustered(false);
      }
      setStep(3);
    } catch (err) {
      console.error('Submission failed:', err);
      alert('Failed to submit issue. Please check details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadgeColor = (score) => {
    switch (score) {
      case 1: return 'bg-green-100 text-green-800 border-green-200';
      case 2: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 4: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 5: return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCategory = (cat) => {
    if (!cat) return '';
    return cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="max-w-3xl mx-auto px-4">
      {/* Stepper Header */}
      <div className="flex items-center justify-between mb-10 max-w-md mx-auto">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition duration-300 ${
                step === s
                  ? 'border-civic-primary bg-civic-primary text-white shadow-lg shadow-blue-100'
                  : step > s
                  ? 'border-civic-primary bg-white text-civic-primary'
                  : 'border-gray-200 bg-white text-gray-400'
              }`}>
                {step > s ? '✓' : s}
              </div>
              <span className={`text-xs mt-2 font-medium ${step === s ? 'text-civic-primary font-bold' : 'text-gray-400'}`}>
                {s === 1 ? 'Upload' : s === 2 ? 'Details' : 'Confirmed'}
              </span>
            </div>
            {s < 3 && (
              <div className={`flex-1 h-0.5 mx-4 transition duration-300 ${step > s ? 'bg-civic-primary' : 'bg-gray-200'}`}></div>
            )}
          </React.Fragment>
        ))}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100 shadow-xl min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-civic-primary border-t-transparent mb-4"></div>
          <p className="text-gray-700 font-semibold text-lg">{loadingMessage}</p>
        </div>
      )}

      {!loading && step === 1 && (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Report a Civic Issue</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Upload a photo or video of the infrastructure problem. Our AI will analyze it to route it to the correct department.
          </p>
          <UploadZone onUploadComplete={handleUploadComplete} />
        </div>
      )}

      {!loading && step === 2 && (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl space-y-6">
          <h2 className="text-2xl font-bold text-gray-800 pb-2 border-b">Review Report Details</h2>

          {/* AI Analysis Preview */}
          <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100/50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-900">AI Observer Analysis</h3>
              {analysis?.is_urgent && (
                <span className="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse">
                  URGENT ESCALATION
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500 block mb-1">Detected Category</span>
                <span className="inline-block px-3 py-1 bg-white border rounded-full text-sm font-semibold text-gray-800">
                  {formatCategory(analysis?.category)}
                </span>
              </div>

              <div>
                <span className="text-xs text-gray-500 block mb-1">Severity Rating (1-5)</span>
                <div className="flex items-center space-x-2">
                  <span className={`inline-block px-2.5 py-0.5 border rounded-full text-xs font-bold ${getSeverityBadgeColor(analysis?.severity_score)}`}>
                    Score: {analysis?.severity_score}/5
                  </span>
                  <div className="flex text-yellow-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-lg">
                        {star <= (analysis?.severity_score || 0) ? '★' : '☆'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <span className="text-xs text-gray-500 block mb-1">Suggested Department</span>
              <span className="text-sm font-semibold text-gray-800 bg-white px-3 py-1.5 rounded-lg border inline-block">
                🏢 {analysis?.suggested_department}
              </span>
            </div>

            <div>
              <span className="text-xs text-gray-500 block mb-1">AI Observer Description</span>
              <p className="text-sm text-gray-700 italic bg-white p-3 rounded-lg border">
                "{analysis?.ai_description}"
              </p>
            </div>

            {analysis?.hazard_tags?.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 block mb-1">Hazard Tags</span>
                <div className="flex flex-wrap gap-2">
                  {analysis.hazard_tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded text-xs font-medium">
                      ⚠️ {tag.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Input: Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Citizen Notes / Additional Details
            </label>
            <p className="text-xs text-indigo-600 font-medium mb-3 flex items-center gap-1">
              <span>🌍</span> You can write in English, Hindi, Marathi, or any regional language. Our AI will auto-translate it for authorities!
            </p>
            <textarea
              rows={3}
              value={userDescription}
              onChange={(e) => setUserDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-civic-primary focus:border-transparent outline-none transition duration-200"
              placeholder="Provide any extra context, landmark references, or detail..."
            />
          </div>

          {/* Location Picker */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Incident Location
            </label>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => detectLocation(false)}
                disabled={locating}
                className="w-full px-5 py-4 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-800 font-semibold rounded-xl flex items-center justify-center space-x-2 border transition duration-200"
              >
                {locating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent"></div>
                    <span>Locating...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">📍</span>
                    <span>Auto-detect GPS Location</span>
                  </>
                )}
              </button>
            </div>

            {/* Interactive Map */}
            <div className="mt-4">
              <span className="text-xs text-gray-500 block mb-2">
                Drag the marker or click on the map to pinpoint the exact location:
              </span>
              <div
                ref={mapContainerRef}
                style={{
                  height: '350px',
                  width: '100%',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
                className="border border-gray-200 shadow-sm"
              />
            </div>

            {(latitude && longitude) && (
              <p className="text-xs text-green-600 font-semibold mt-2 flex items-center space-x-1">
                <span>✓ GPS coordinates locked:</span>
                <span className="font-mono bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </span>
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-between pt-6 border-t">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition duration-200"
            >
              Back
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-civic-primary hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition duration-200"
            >
              Submit Report
            </button>
          </div>
        </form>
      )}

      {!loading && step === 3 && (
        <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-xl text-center space-y-6 max-w-xl mx-auto">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner animate-bounce">
            🎉
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-gray-800">
              {isClustered ? 'Report Added to Mega-Issue!' : 'Report Successfully Filed!'}
            </h2>
            <p className="text-gray-500">
              {isClustered 
                ? 'Your report was matched with a nearby issue of the same category. We have added your report to increase its priority!' 
                : 'Thank you for contributing to your city\'s improvement.'}
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl inline-flex items-center space-x-2 shadow-sm">
            <span className="text-xl">🏆</span>
            <span className="text-yellow-800 font-bold">Civic Points Earned: +10</span>
          </div>

          <div className="border rounded-xl p-4 bg-gray-50/50 max-w-xs mx-auto">
            <span className="text-xs text-gray-400 block mb-1 uppercase tracking-wider font-semibold">Incident Reference ID</span>
            <span className="font-mono text-sm font-bold text-gray-800 select-all">{submittedId}</span>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={`/issues/${submittedId}`}
              className="px-6 py-3 bg-civic-primary hover:bg-blue-600 text-white font-bold rounded-xl shadow-md transition duration-200"
            >
              View Report Status
            </Link>
            <button
              onClick={() => {
                setStep(1);
                setMediaBase64('');
                setMediaType('');
                setAnalysis(null);
                setUserDescription('');
                setLatitude(null);
                setLongitude(null);
                setAddress('');
                setSubmittedId('');
                setIsClustered(false);
              }}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl border transition duration-200"
            >
              File Another Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
