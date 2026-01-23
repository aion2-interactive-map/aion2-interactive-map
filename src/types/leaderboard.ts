export interface ApiResponse<T> {
  errorCode: "Success" | string;
  errorMessage: string;
  showType: number;
  data: {
    count: number;
    results: T[];
  };
}

export interface Season {
  id: string;
  number: number;
  serverRegion: string;
  startDate: string;
  endDate: string;
}

export interface Server {
  id: string;
  serverRegion: string;
  raceId: number;
  serverId: number;
  serverName: string;
  serverShortName: string;
}

export interface ServerMatching {
  id: string;
  seasonId: string;
  server1Id: string;
  server2Id: string;
  season: Season;
  server1: Server;
  server2: Server;
}

export interface Marker {
  id: string;
  mapId: string;
  subtypeId: string;
  regionId: string | null;
  name: string;
  x: number;
  y: number;
  indexInSubtype: number;
  icon: string;
  type: string;
}

export interface Artifact {
  id: string;
  markerId: string;
  order: number;
  marker: Marker;
}

export interface ArtifactState {
  id: string;
  abyssArtifactId: string;
  serverMatchingId: string;
  state: number;
  recordTime: string;
}

export interface ArtifactCount {
  serverId: number;
  artifactCount: number;
  artifactTotal: number;
}
