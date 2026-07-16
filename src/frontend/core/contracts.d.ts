interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface HomeWeatherRadioState {
  loading: boolean;
  loaded: boolean;
  city: string;
  weather: HomeWeather | null;
  radio: HomeWeatherRadio | null;
  error: string;
  updatedAt: number;
}

interface HomeWeather {
  location?: { name?: string };
  mood?: { title?: string; tagline?: string; key?: string };
  label?: string;
  temperature?: number;
  apparentTemperature?: number;
  humidity?: number;
  windSpeed?: number;
}

interface HomeWeatherRadio {
  title?: string;
  subtitle?: string;
  songs?: PlaylistSong[];
  seedQueries?: string[];
}

interface MineradioGlobalApi {
  bootstrap?: typeof bootstrapMineradio;
  dispose?: typeof disposeMineradio;
}

interface Window {
  Mineradio?: MineradioGlobalApi;
}

declare let playlistSourceFilter: string;
declare let homeWeatherRadioState: HomeWeatherRadioState;
declare var PLAYLIST_SOURCE_FILTER_STORE_KEY: string;
declare var HOME_WEATHER_CITY_KEY: string;

declare function hexToRgb(hex: string): RgbColor;
declare function bootstrapMineradio(): void;
declare function disposeMineradio(): void;
declare function installMineradioCompatibility(): void;
