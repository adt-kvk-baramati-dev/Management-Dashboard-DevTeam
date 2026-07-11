import React, { useMemo } from 'react';
import { MapPin } from 'lucide-react';

interface FarmerLocationData {
  state: string;
  district: string;
  taluka: string;
  village: string;
  count: number;
  lat: number;
  lng: number;
}

interface IndiaMapProps {
  farmerData: FarmerLocationData[];
  onLocationClick?: (location: FarmerLocationData) => void;
}

const IndiaMap: React.FC<IndiaMapProps> = ({ farmerData, onLocationClick }) => {
  // Filter Maharashtra data
  const maharashtraData = useMemo(() => {
    return farmerData.filter(d => d.state === 'Maharashtra');
  }, [farmerData]);

  const stats = useMemo(() => {
    const mhData = maharashtraData;
    return {
      totalFarmers: mhData.reduce((sum, d) => sum + d.count, 0),
      totalDistricts: new Set(mhData.map(d => d.district)).size,
      totalTalukas: new Set(mhData.map(d => d.taluka)).size,
      totalVillages: mhData.length,
    };
  }, [maharashtraData]);

  return (
    <div className="w-full h-full bg-background border border-border/50 rounded-lg flex items-center justify-center p-6">
      <div className="text-center max-w-2xl">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Maharashtra GIS Map</h2>
        </div>

        <p className="text-muted-foreground mb-6">Farmer location and resource distribution across Maharashtra</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border/50 rounded-lg p-4 hover:shadow-md transition-shadow">
            <p className="text-2xl font-bold text-primary">{stats.totalFarmers.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">Farmers</p>
          </div>
          <div className="bg-card border border-border/50 rounded-lg p-4 hover:shadow-md transition-shadow">
            <p className="text-2xl font-bold text-primary">{stats.totalDistricts}</p>
            <p className="text-sm text-muted-foreground mt-1">Districts</p>
          </div>
          <div className="bg-card border border-border/50 rounded-lg p-4 hover:shadow-md transition-shadow">
            <p className="text-2xl font-bold text-primary">{stats.totalTalukas}</p>
            <p className="text-sm text-muted-foreground mt-1">Talukas</p>
          </div>
          <div className="bg-card border border-border/50 rounded-lg p-4 hover:shadow-md transition-shadow">
            <p className="text-2xl font-bold text-primary">{stats.totalVillages}</p>
            <p className="text-sm text-muted-foreground mt-1">Villages</p>
          </div>
        </div>

        {maharashtraData.length > 0 ? (
          <div className="bg-card border border-border/50 rounded-lg p-6 shadow-sm">
            <h3 className="font-semibold text-foreground mb-4">Location Breakdown</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {maharashtraData.slice(0, 10).map((location, index) => (
                <div
                  key={index}
                  onClick={() => onLocationClick?.(location)}
                  className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border/30 hover:bg-primary/10 hover:border-primary/30 cursor-pointer transition-all duration-200"
                >
                  <div className="text-left">
                    <p className="font-medium text-foreground">{location.district}</p>
                    <p className="text-xs text-muted-foreground">{location.taluka} • {location.village}</p>
                  </div>
                  <p className="font-semibold text-primary">{location.count}</p>
                </div>
              ))}
            </div>
            {maharashtraData.length > 10 && (
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/30">
                Showing 10 of {maharashtraData.length} locations
              </p>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border/50 rounded-lg p-6 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No farmer data available for Maharashtra</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IndiaMap;
