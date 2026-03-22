export interface FallbackLocation {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  note: string;
}

export const FALLBACK_LOCATIONS: FallbackLocation[] = [
  {
    id: 'beijing',
    name: '北京',
    region: '华北',
    lat: 39.9042,
    lng: 116.4074,
    note: '适合北京及周边地区的兜底中心点。',
  },
  {
    id: 'shanghai',
    name: '上海',
    region: '华东',
    lat: 31.2304,
    lng: 121.4737,
    note: '适合作为华东地区的默认兜底中心点。',
  },
  {
    id: 'guangzhou',
    name: '广州',
    region: '华南',
    lat: 23.1291,
    lng: 113.2644,
    note: '适合珠三角地区的兜底中心点。',
  },
  {
    id: 'shenzhen',
    name: '深圳',
    region: '华南',
    lat: 22.5431,
    lng: 114.0579,
    note: '适合深圳及周边地区的兜底中心点。',
  },
  {
    id: 'hangzhou',
    name: '杭州',
    region: '华东',
    lat: 30.2741,
    lng: 120.1551,
    note: '适合杭州及周边地区的兜底中心点。',
  },
  {
    id: 'nanjing',
    name: '南京',
    region: '华东',
    lat: 32.0603,
    lng: 118.7969,
    note: '适合南京及周边地区的兜底中心点。',
  },
  {
    id: 'wuhan',
    name: '武汉',
    region: '华中',
    lat: 30.5928,
    lng: 114.3055,
    note: '适合华中地区的兜底中心点。',
  },
  {
    id: 'chengdu',
    name: '成都',
    region: '西南',
    lat: 30.5728,
    lng: 104.0668,
    note: '适合成都及周边地区的兜底中心点。',
  },
  {
    id: 'xian',
    name: '西安',
    region: '西北',
    lat: 34.3416,
    lng: 108.9398,
    note: '适合西安及周边地区的兜底中心点。',
  },
];
