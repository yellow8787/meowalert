/** 將精確座標模糊到 0.001° 精度（約 111m），對應資料庫 trigger 的邏輯 */
export function blurLocation(lat: number, lng: number) {
  return {
    lat: Math.round(lat * 1000) / 1000,
    lng: Math.round(lng * 1000) / 1000,
  };
}
