"use client";
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Leaf, AlertTriangle, Info, BarChart3, Trash, Save } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Types
interface WastePoint {
  location: { lat: number; lng: number };
  quantity: number;
  wasteType: string;
  description: string;
  timestamp: string;
  reporter: string;
}

interface HotspotLocation {
  lat: number;
  lng: number;
  severity: number;
  estimatedWaste: number;
}

interface CleanZone {
  lat: number;
  lng: number;
  radius: number;
  maintainer: string;
}

interface Insights {
  summary: string;
  totalWaste: number;
  wasteByType: Record<string, number>;
  hotspotLocations: HotspotLocation[];
  cleanZones: CleanZone[];
  recommendations: string[];
}

// Dynamic imports for Leaflet components
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
);

const Circle = dynamic(
  () => import('react-leaflet').then(mod => mod.Circle),
  { ssr: false }
);

// Fix Leaflet icon issue in Next.js
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/markers/marker-icon-2x.png',
    iconUrl: '/markers/marker-icon.png',
    shadowUrl: '/markers/marker-shadow.png',
  });
}

// Custom icons with proper typing
const createCustomIcon = (iconUrl: string): L.Icon => new L.Icon({
  iconUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const wasteIcon = createCustomIcon('/markers/waste-marker.png');
const greenIcon = createCustomIcon('/markers/green-marker.png');
const redIcon = createCustomIcon('/markers/red-marker.png');

// MapClickHandler with proper typing
interface MapClickHandlerProps {
  onLocationSelect: (latlng: { lat: number; lng: number }) => void;
}

const MapClickHandler: React.FC<MapClickHandlerProps> = ({ onLocationSelect }) => {
  const { useMapEvents } = require('react-leaflet');
  useMapEvents({
    click: (e: { latlng: { lat: number; lng: number } }) => {
      onLocationSelect(e.latlng);
    },
  });
  return null;
};

// ContractInteraction with proper typing
interface ContractInteractionProps {
  onWasteReport: (quantity: number, wasteType: string, description: string) => void;
}

const ContractInteraction: React.FC<ContractInteractionProps> = ({ onWasteReport }) => {
  const [quantity, setQuantity] = useState<number>(0);
  const [wasteType, setWasteType] = useState<string>('Plastic');
  const [description, setDescription] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onWasteReport(quantity, wasteType, description);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Quantity (kg)</label>
        <input
          type="number"
          min="0"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium">Waste Type</label>
        <select
          value={wasteType}
          onChange={(e) => setWasteType(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50"
          required
        >
          <option value="Plastic">Plastic</option>
          <option value="Paper">Paper</option>
          <option value="Electronic">Electronic</option>
          <option value="Organic">Organic</option>
          <option value="Metal">Metal</option>
          <option value="Glass">Glass</option>
          <option value="Other">Other</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50"
          rows={3}
        />
      </div>
      
      <Button type="submit" className="w-full">
        <Save className="mr-2 h-4 w-4" /> Submit Waste Report
      </Button>
    </form>
  );
};

// Main Map component
const Map: React.FC = () => {
  const [wastePoints, setWastePoints] = useState<WastePoint[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("map");
  const [mapCenter, setMapCenter] = useState<[number, number]>([51.505, -0.09]);
  const [zoom, setZoom] = useState<number>(13);
  const [selectedAreaRadius, setSelectedAreaRadius] = useState<number>(500);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    // Get user's location and fetch waste points
    const initializeMap = async () => {
      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setMapCenter([latitude, longitude]);
        }
      } catch (error) {
        console.error("Error getting location:", error);
      }

      fetchWastePoints();
    };

    initializeMap();
  }, []);

  const fetchWastePoints = async () => {
    setIsLoading(true);
    try {
      // Mock waste data points since we don't have the actual backend
      const mockData: WastePoint[] = [
        {
          location: { lat: 51.505, lng: -0.09 },
          quantity: 15,
          wasteType: "Plastic",
          description: "Plastic bottles and bags",
          timestamp: new Date().toISOString(),
          reporter: "0x123...789"
        },
        {
          location: { lat: 51.51, lng: -0.1 },
          quantity: 8,
          wasteType: "Paper",
          description: "Cardboard boxes",
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          reporter: "0xabc...def"
        },
        {
          location: { lat: 51.5, lng: -0.12 },
          quantity: 20,
          wasteType: "Electronic",
          description: "Old electronic devices",
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          reporter: "0x456...def"
        }
      ];
      setWastePoints(mockData);
      
      // Generate mock insights
      const mockInsights: Insights = {
        summary: "3 waste reports recorded in the last week.",
        totalWaste: 43,
        wasteByType: {
          "Plastic": 15,
          "Paper": 8,
          "Electronic": 20
        },
        hotspotLocations: [
          { lat: 51.505, lng: -0.09, severity: 7, estimatedWaste: 30 },
          { lat: 51.51, lng: -0.1, severity: 3, estimatedWaste: 13 }
        ],
        cleanZones: [
          { lat: 51.49, lng: -0.11, radius: 300, maintainer: "EcoClean" }
        ],
        recommendations: [
          "Increase recycling awareness in the central area.",
          "Deploy more collection points near the first hotspot.",
          "Organize a community cleanup event."
        ]
      };
      setInsights(mockInsights);
    } catch (error) {
      console.error("Error fetching waste points:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWasteReport = async (quantity: number, wasteType: string, description: string) => {
    if (!selectedLocation) {
      alert("Please select a location on the map first");
      return;
    }
    
    setIsLoading(true);
    try {
      const wasteData: WastePoint = { 
        location: selectedLocation, 
        quantity, 
        wasteType,
        description,
        timestamp: new Date().toISOString(),
        reporter: "0x123...789"
      };
      
      // Simulate encryption and submission delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add the new point to the map
      setWastePoints([...wastePoints, wasteData]);
      
      // Clear selected location
      setSelectedLocation(null);
      
      // Update insights with mock data
      const newTotalWaste = (insights?.totalWaste || 0) + quantity;
      const newWasteByType = { ...(insights?.wasteByType || {}) };
      newWasteByType[wasteType] = (newWasteByType[wasteType] || 0) + quantity;
      
      const updatedInsights: Insights = {
        ...insights,
        totalWaste: newTotalWaste,
        wasteByType: newWasteByType,
        summary: `${wastePoints.length + 1} waste reports recorded.`,
        hotspotLocations: [
          ...(insights?.hotspotLocations || []),
          // Add new location as a potential hotspot if quantity is large
          ...(quantity > 10 ? [{ 
            lat: selectedLocation.lat, 
            lng: selectedLocation.lng, 
            severity: Math.min(quantity / 5, 10), // Scale severity
            estimatedWaste: quantity
          }] : [])
        ]
      };
      
      setInsights(updatedInsights);
      
      alert("Waste report submitted successfully!");
    } catch (error) {
      console.error("Error submitting waste report:", error);
      alert("Failed to submit waste report. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = (latlng: { lat: number; lng: number }) => {
    setSelectedLocation(latlng);
    // Pan to the selected location
    if (mapRef.current) {
      mapRef.current.flyTo(latlng, 15);
    }
  };

  const handleZoomToHotspot = (location: { lat: number; lng: number }) => {
    if (mapRef.current) {
      mapRef.current.flyTo([location.lat, location.lng], 16);
    }
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row">
      <div className="w-full lg:w-3/4 h-3/4 lg:h-full relative">
        <MapContainer 
          center={mapCenter} 
          zoom={zoom} 
          style={{ height: '100%', width: '100%' }}
          whenCreated={(map) => { mapRef.current = map; }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* User's current location */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]}>
              <Popup>Your current location</Popup>
            </Marker>
          )}
          
          {/* Waste points */}
          {wastePoints.map((point, index) => (
            <Marker 
              key={`waste-${index}`} 
              position={[point.location.lat, point.location.lng]} 
              icon={wasteIcon}
            >
              <Popup>
                <div className="font-medium">Waste Report</div>
                <div>Quantity: {point.quantity} kg</div>
                {point.wasteType && <div>Type: {point.wasteType}</div>}
                {point.description && <div>Description: {point.description}</div>}
                {point.timestamp && <div>Reported: {new Date(point.timestamp).toLocaleString()}</div>}
              </Popup>
            </Marker>
          ))}
          
          {/* Waste hotspots from insights */}
          {insights && insights.hotspotLocations && insights.hotspotLocations.map((point, index) => (
            <Circle 
              key={`hotspot-${index}`}
              center={[point.lat, point.lng]}
              radius={point.severity * 100} // Radius based on severity
              pathOptions={{
                color: 'red',
                fillColor: 'red',
                fillOpacity: 0.3
              }}
            >
              <Popup>
                <div className="font-medium">Waste Hotspot</div>
                <div>Severity: {point.severity}/10</div>
                <div>Estimated waste: {point.estimatedWaste}kg</div>
              </Popup>
            </Circle>
          ))}
          
          {/* Clean zones from insights */}
          {insights && insights.cleanZones && insights.cleanZones.map((point, index) => (
            <Circle 
              key={`clean-${index}`}
              center={[point.lat, point.lng]}
              radius={point.radius || 200}
              pathOptions={{
                color: 'green',
                fillColor: 'green',
                fillOpacity: 0.2
              }}
            >
              <Popup>
                <div className="font-medium">Clean Zone</div>
                <div>Maintained by: {point.maintainer || 'Community'}</div>
              </Popup>
            </Circle>
          ))}
          
          {/* Selected location */}
          {selectedLocation && (
            <>
              <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={redIcon}>
                <Popup>
                  Selected Location
                  <br />
                  Lat: {selectedLocation.lat.toFixed(6)}
                  <br />
                  Lng: {selectedLocation.lng.toFixed(6)}
                </Popup>
              </Marker>
              <Circle 
                center={[selectedLocation.lat, selectedLocation.lng]}
                radius={selectedAreaRadius}
                pathOptions={{
                  color: 'blue',
                  fillColor: 'blue',
                  fillOpacity: 0.1
                }}
              />
            </>
          )}
          
          {/* Map click handler */}
          <MapClickHandler onLocationSelect={handleLocationSelect} />
        </MapContainer>
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-md shadow-md">
              <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"></div>
              <div className="mt-2 text-center">Processing...</div>
            </div>
          </div>
        )}
      </div>
      
      <div className="w-full lg:w-1/4 h-1/4 lg:h-full overflow-y-auto bg-white border-l border-gray-200">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="map">Map Tools</TabsTrigger>
            <TabsTrigger value="report">Report</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>
          
          <TabsContent value="map" className="p-4">
            <Card>
              <CardHeader>
                <CardTitle>Map Controls</CardTitle>
                <CardDescription>Manage your map view and selections</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full" 
                  onClick={() => userLocation && mapRef.current.flyTo([userLocation.lat, userLocation.lng], 15)}
                >
                  <Info className="mr-2 h-4 w-4" /> My Location
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setSelectedLocation(null)}
                >
                  Clear Selection
                </Button>
                
                {selectedLocation && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Selected Location</div>
                    <div className="text-xs">Lat: {selectedLocation.lat.toFixed(6)}</div>
                    <div className="text-xs">Lng: {selectedLocation.lng.toFixed(6)}</div>
                    <div className="pt-2">
                      <label className="text-sm font-medium">Area Radius (m):</label>
                      <input 
                        type="range" 
                        min="100" 
                        max="2000" 
                        step="100" 
                        value={selectedAreaRadius} 
                        onChange={(e) => setSelectedAreaRadius(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-xs text-right">{selectedAreaRadius}m</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {insights && insights.hotspotLocations && insights.hotspotLocations.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Waste Hotspots</CardTitle>
                  <CardDescription>Areas with high waste concentration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {insights.hotspotLocations.map((hotspot, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-2 border rounded-md cursor-pointer hover:bg-gray-50"
                      onClick={() => handleZoomToHotspot(hotspot)}
                    >
                      <div className="flex items-center">
                        <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
                        <span>Hotspot {index + 1}</span>
                      </div>
                      <div className="text-sm text-gray-500">Severity: {hotspot.severity}/10</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="report" className="p-4">
            <Card>
              <CardHeader>
                <CardTitle>Report Waste</CardTitle>
                <CardDescription>Submit a new waste sighting</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedLocation ? (
                  <ContractInteraction onWasteReport={handleWasteReport} />
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Action Required</AlertTitle>
                    <AlertDescription>
                      Please click on the map to select a waste location first.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="insights" className="p-4">
            <Card>
              <CardHeader>
                <CardTitle>Waste Insights</CardTitle>
                <CardDescription>Analytics and trends from collected data</CardDescription>
              </CardHeader>
              <CardContent>
                {!insights ? (
                  <div className="text-center py-4">
                    <BarChart3 className="h-10 w-10 mx-auto text-gray-400" />
                    <p className="mt-2 text-gray-500">No insights available yet.</p>
                    <Button 
                      variant="outline" 
                      className="mt-4" 
                      onClick={() => fetchWastePoints()}
                    >
                      Generate Insights
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Summary</h4>
                      <p className="text-sm text-gray-600">
                        {insights.summary || "Total of " + wastePoints.length + " waste reports recorded."}
                      </p>
                    </div>
                    
                    {insights.totalWaste && (
                      <div>
                        <h4 className="font-medium">Total Waste</h4>
                        <p className="text-2xl font-bold">{insights.totalWaste} kg</p>
                      </div>
                    )}
                    
                    {insights.wasteByType && (
                      <div>
                        <h4 className="font-medium">Waste by Type</h4>
                        <div className="space-y-1 mt-2">
                          {Object.entries(insights.wasteByType).map(([type, amount]) => (
                            <div key={type} className="flex justify-between">
                              <span className="text-sm">{type}</span>
                              <span className="text-sm font-medium">{amount} kg</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {insights.recommendations && (
                      <div>
                        <h4 className="font-medium">Recommendations</h4>
                        <ul className="list-disc pl-5 text-sm space-y-1 mt-2">
                          {insights.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Map;