import { useState, useEffect } from "react";
import {
  MapPin,
  Layers,
  Eye,
  EyeOff,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthProvider";
import IndiaMap from "@/components/IndiaMap";
import AdminLayout from "@/components/AdminLayout";

interface FarmerLocationData {
  state: string;
  district: string;
  taluka: string;
  village: string;
  count: number;
  lat: number;
  lng: number;
}

export default function GISMap() {
  const { token } = useAuth();
  const [farmerData, setFarmerData] = useState<FarmerLocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<FarmerLocationData | null>(null);
  const [visibleLayers, setVisibleLayers] = useState({
    farmers: true,
    complaints: true,
    programs: true,
    sampling: true,
  });

  useEffect(() => {
    fetchFarmerLocations();
  }, [token]);

  const fetchFarmerLocations = async () => {
    // For testing without authentication, use mock data
    if (!token) {
      console.log('No token available, using mock data for testing');
      setFarmerData([
        { state: 'Maharashtra', district: 'Pune', taluka: 'Pune', village: 'Test Village', count: 25, lat: 18.5204, lng: 73.8567 },
        { state: 'Gujarat', district: 'Ahmedabad', taluka: 'Ahmedabad', village: 'Test Village', count: 30, lat: 23.0225, lng: 72.5714 },
        { state: 'Rajasthan', district: 'Jaipur', taluka: 'Jaipur', village: 'Test Village', count: 20, lat: 26.9124, lng: 75.7873 },
      ]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching farmer locations...');
      const response = await fetch("/api/admin/farmer-locations", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('API Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Farmer locations data:', data);
        setFarmerData(data.locations || []);
        setError(null);
      } else {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        setError(`Failed to load farmer locations: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching farmer locations:", error);
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleLayer = (layer: keyof typeof visibleLayers) => {
    setVisibleLayers((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  };

  const handleLocationClick = (location: FarmerLocationData) => {
    setSelectedLocation(location);
  };

  const totalFarmers = farmerData.reduce((sum, loc) => sum + loc.count, 0);
  const uniqueStates = new Set(farmerData.map(loc => loc.state)).size;
  const uniqueDistricts = new Set(farmerData.map(loc => loc.district)).size;

  return (
    <AdminLayout title="GIS map">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-lg border border-border/50 p-4 space-y-4 shadow-sm">
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Statistics
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Farmers:</span>
                  <span className="font-semibold text-foreground">{totalFarmers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">States:</span>
                  <span className="font-semibold text-foreground">{uniqueStates}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Districts:</span>
                  <span className="font-semibold text-foreground">{uniqueDistricts}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Layers
              </h3>
              <div className="space-y-2">
                {Object.entries(visibleLayers).map(([layer, visible]) => (
                  <div key={layer} className="flex items-center justify-between">
                    <span className="text-sm capitalize text-muted-foreground">{layer}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleLayer(layer as keyof typeof visibleLayers)}
                      className="p-1"
                    >
                      {visible ? (
                        <Eye className="w-4 h-4 text-primary" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground/60" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {selectedLocation && (
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location Details
                </h3>
                <div className="bg-secondary/50 p-3 rounded-lg border border-border/30 space-y-2 text-sm text-foreground">
                  <div><strong>State:</strong> {selectedLocation.state}</div>
                  <div><strong>District:</strong> {selectedLocation.district}</div>
                  <div><strong>Taluka:</strong> {selectedLocation.taluka}</div>
                  <div><strong>Village:</strong> {selectedLocation.village}</div>
                  <div><strong>Farmers:</strong> {selectedLocation.count}</div>
                </div>
              </div>
            )}

            <Button
              onClick={fetchFarmerLocations}
              className="w-full"
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-card rounded-lg shadow-sm border border-border/50 h-[70vh] lg:h-[calc(100vh-12rem)] overflow-hidden">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading farmer location data...</p>
                </div>
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="text-destructive text-4xl mb-4">⚠️</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Map</h3>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button onClick={fetchFarmerLocations} className="rounded-lg">
                    Try Again
                  </Button>
                </div>
              </div>
            ) : (
              <IndiaMap
                farmerData={farmerData}
                onLocationClick={handleLocationClick}
              />
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
