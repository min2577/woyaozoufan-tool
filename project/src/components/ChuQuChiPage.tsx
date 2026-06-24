import { useState, useEffect, useRef } from 'react';
import { Search, Utensils } from 'lucide-react';
import { searchNearbyPlaces, Restaurant, Market } from '../utils/aiEngine';

const SearchBar = ({ onAddressChange, onDistanceChange, selectedDistance, onSearch, onOpenMap }: any) => {
  return (
    <div className="bg-yellow-400 p-3 rounded-xl mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Search className="w-5 h-5 text-gray-600" />
        <input
          type="text"
          placeholder="输入地址"
          onChange={(e) => onAddressChange(e.target.value)}
          className="flex-1 px-4 py-2 rounded-full bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <button
          onClick={onSearch}
          className="px-4 py-2 rounded-full bg-orange-500 text-white text-sm font-medium"
        >
          搜索
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenMap}
          className="px-3 py-1 rounded bg-white text-sm text-gray-700"
        >
          🗺️ 地图选点
        </button>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => onDistanceChange(500)}
            className={`px-3 py-1 rounded-full text-sm font-medium ${selectedDistance === 500 ? 'bg-orange-500 text-white' : 'bg-white text-gray-700'}`}
          >
            500m
          </button>
          <button
            onClick={() => onDistanceChange(1000)}
            className={`px-3 py-1 rounded-full text-sm font-medium ${selectedDistance === 1000 ? 'bg-orange-500 text-white' : 'bg-white text-gray-700'}`}
          >
            1000m
          </button>
        </div>
      </div>
    </div>
  );
};

const FilterSortBar = ({ onCategoryChange, onSortChange, selectedCategory, selectedSort }: any) => {
  const categories = ['美食', '低价菜场'];
  const sorts = ['按价格排序', '按距离排序'];
  
  return (
    <div className="mb-4">
      {/* 分类筛选 (水平滚动) */}
      <div className="flex overflow-x-auto gap-2 pb-2 mb-3 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${selectedCategory === category ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {category}
          </button>
        ))}
      </div>
      
      {/* 排序筛选 */}
      <div className="flex gap-3">
        {sorts.map((sort) => (
          <button
            key={sort}
            onClick={() => onSortChange(sort)}
            className={`px-3 py-1 rounded text-xs font-medium ${selectedSort === sort ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {sort}
          </button>
        ))}
      </div>
    </div>
  );
};

const RestaurantCard = ({ restaurant }: { restaurant: Restaurant }) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* 商家图片 */}
      <div className="relative w-full h-36 overflow-hidden">
        <img 
          src={restaurant.image || "https://via.placeholder.com/300x200?text=No+Image"} 
          alt={restaurant.name} 
          className="w-full h-full object-cover"
        />
        {/* 距离标签 */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
          {restaurant.distance}m
        </div>
      </div>
      
      {/* 商家信息 */}
      <div className="p-3">
        <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-1">{restaurant.name}</h3>
        <div className="mt-1 text-sm text-orange-600 dark:text-orange-400">
          人均：{restaurant.price > 0 ? `${restaurant.price}元` : '暂无'}
        </div>
      </div>
    </div>
  );
};

const MarketCard = ({ market }: { market: Market }) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* 商家图片 */}
      <div className="relative w-full h-36 overflow-hidden">
        <img 
          src={market.image || "https://via.placeholder.com/300x200?text=No+Image"} 
          alt={market.name} 
          className="w-full h-full object-cover"
        />
        {/* 距离标签 */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
          {market.distance}m
        </div>
      </div>
      
      {/* 商家信息 */}
      <div className="p-3">
        <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-1">{market.name}</h3>
        {market.discount && (
          <div className="mt-1 text-sm text-orange-600 dark:text-orange-400">
            🔖 {market.discount}
          </div>
        )}
        {market.hours && (
          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            🕒 {market.hours}
          </div>
        )}
      </div>
    </div>
  );
};

const ChuQuChiPage = () => {
  const [address, setAddress] = useState('');
  const [selectedDistance, setSelectedDistance] = useState(500);
  const [selectedCategory, setSelectedCategory] = useState('美食');
  const [selectedSort, setSelectedSort] = useState('按距离排序');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  
  // 使用useRef获取地图容器引用
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // 搜索函数
  const handleSearch = async () => {
    if (!address.trim() && !selectedLocation) {
      setError('请输入地址或选择地图位置');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('开始调用searchNearbyPlaces:', { address, selectedDistance, selectedCategory, selectedSort, selectedLocation });
      
      // 如果有地图选点，使用完整的选点对象，否则使用地址字符串
      const searchParam = selectedLocation || address;
      
      const data = await searchNearbyPlaces(
        searchParam,
        selectedDistance,
        selectedCategory,
        selectedSort === '按距离排序' ? 'distance' : 'price'
      );
      
      console.log('searchNearbyPlaces返回结果:', data);
      setRestaurants(data.restaurants);
      setMarkets(data.markets);
      console.log('状态已更新:', { restaurants: data.restaurants, markets: data.markets });
    } catch (err) {
      setError('获取数据失败，请重试');
      console.error('获取附近场所失败:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 打开地图选点模态框
  const handleOpenMap = () => {
    setShowMapModal(true);
  };
  
  // 快速定位当前位置
  const handleLocateCurrentPosition = () => {
    console.log('开始定位当前位置');
    const AMap = (window as any).AMap;
    if (!AMap) {
      console.error('高德地图API未加载');
      alert('地图API未加载，请稍后重试');
      return;
    }
    
    // 检查是否有地图实例
    const mapInstance = (window as any).currentMapInstance;
    if (!mapInstance) {
      console.error('地图实例不存在');
      alert('地图初始化失败，请稍后重试');
      return;
    }
    
    // 使用高德地图Geolocation插件获取当前位置
    AMap.plugin('AMap.Geolocation', () => {
      const geolocation = new AMap.Geolocation({
        enableHighAccuracy: true, // 启用高精度定位
        timeout: 10000, // 定位超时时间
        buttonOffset: new AMap.Pixel(10, 20),
        zoomToAccuracy: true, // 定位成功后自动缩放地图
        buttonPosition: 'RB'
      });
      
      // 获取当前位置
      geolocation.getCurrentPosition((status: string, result: any) => {
        console.log('定位结果:', status, result);
        
        if (status === 'complete' && result.position) {
          const lng = result.position.lng;
          const lat = result.position.lat;
          console.log('获取到的当前位置:', lng, lat);
          
          // 清除旧标记
          let marker = (window as any).currentMarker;
          if (marker) {
            marker.setMap(null);
          }
          
          // 更新地图中心
          mapInstance.setCenter([lng, lat]);
          mapInstance.setZoom(16); // 放大地图
          
          // 添加新标记
          marker = new AMap.Marker({
            position: [lng, lat],
            map: mapInstance,
            title: '当前位置',
            visible: true,
            icon: new AMap.Icon({
              size: new AMap.Size(25, 34),
              image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
              imageSize: new AMap.Size(25, 34)
            })
          });
          
          // 更新当前标记引用
          (window as any).currentMarker = marker;
          
          // 逆地理编码获取地址
          AMap.plugin('AMap.Geocoder', () => {
            const geocoder = new AMap.Geocoder();
            geocoder.getAddress([lng, lat], async (geocodeStatus: string, geocodeResult: any) => {
              if (geocodeStatus === 'complete' && geocodeResult.info === 'OK' && geocodeResult.regeocode) {
                const address = geocodeResult.regeocode.formattedAddress;
                console.log('当前位置地址:', address);
                setSelectedLocation({ lat, lng, name: address });
              } else {
                console.log('无法获取当前位置地址，尝试搜索附近可选择的位置');
                
                // 默认使用经纬度作为名称
                const defaultName = `当前位置 (${lng.toFixed(4)}, ${lat.toFixed(4)})`;
                
                try {
                  // 尝试搜索附近的POI，获取最近的可选择位置
                  const AMap = (window as any).AMap;
                  AMap.plugin('AMap.PlaceSearch', () => {
                    const placeSearch = new AMap.PlaceSearch({
                      pageSize: 1,
                      pageIndex: 1,
                      radius: 500,
                      extensions: 'all'
                    });
                    
                    placeSearch.searchNearBy('餐饮', [lng, lat], 500, (status: string, result: any) => {
                      if (status === 'complete' && result.pois && result.pois.length > 0) {
                        const nearestPOI = result.pois[0];
                        const poiName = nearestPOI.name || defaultName;
                        const poiLocation = nearestPOI.location;
                        
                        console.log('找到最近的可选择位置:', poiName, poiLocation);
                        
                        // 更新地图中心到最近的POI
                        mapInstance.setCenter(poiLocation);
                        
                        // 更新标记位置
                        marker.setPosition(poiLocation);
                        (window as any).currentMarker = marker;
                        
                        // 更新选中位置
                        setSelectedLocation({
                          lat: poiLocation.lat,
                          lng: poiLocation.lng,
                          name: poiName
                        });
                      } else {
                        console.log('没有找到附近的POI，使用经纬度作为名称:', defaultName);
                        setSelectedLocation({ lat, lng, name: defaultName });
                      }
                    });
                  });
                } catch (error) {
                  console.error('搜索附近POI失败:', error);
                  setSelectedLocation({ lat, lng, name: defaultName });
                }
              }
            });
          });
        } else {
          console.error('定位失败:', result);
          // 提供更友好的错误提示和备选方案
          let errorMsg = '定位失败，请尝试以下方法：\n1. 确认已开启浏览器位置权限\n2. 检查网络连接\n3. 手动在地图上点击选择位置';
          if (result && result.message) {
            errorMsg += `\n\n错误详情: ${result.message}`;
          }
          alert(errorMsg);
        }
      });
    });
  };
  
  // 关闭地图选点模态框
  const handleCloseMap = () => {
    setShowMapModal(false);
  };
  

  
  // 地图初始化和点击事件
  useEffect(() => {
    if (showMapModal && typeof window !== 'undefined') {
      let mapInstance: any = null;
      let marker: any = null;
      
      // 使用useRef获取地图容器
      const mapContainer = mapContainerRef.current;
      if (!mapContainer) {
        console.error('地图容器不存在');
        return;
      }
      
      // 强制设置容器尺寸和样式
      mapContainer.style.width = '100%';
      mapContainer.style.height = '400px';
      mapContainer.style.display = 'block';
      mapContainer.style.position = 'relative';
      mapContainer.style.zIndex = '1000'; // 确保z-index足够高
      mapContainer.style.overflow = 'visible';
      mapContainer.style.backgroundColor = '#ffffff';
      mapContainer.style.border = 'none';
      
      // 检查容器尺寸
      let containerRect = mapContainer.getBoundingClientRect();
      console.log('地图容器尺寸:', containerRect);
      
      // 如果容器尺寸为0，尝试强制刷新尺寸
      if (containerRect.width <= 0 || containerRect.height <= 0) {
        console.error('地图容器尺寸为0，尝试强制刷新');
        // 强制刷新容器尺寸
        mapContainer.style.width = '100%';
        mapContainer.style.height = '400px';
        mapContainer.style.minHeight = '400px';
        
        // 触发重排
        mapContainer.offsetHeight;
        
        // 重新检查尺寸
        containerRect = mapContainer.getBoundingClientRect();
        console.log('强制刷新后地图容器尺寸:', containerRect);
        
        if (containerRect.width <= 0 || containerRect.height <= 0) {
          console.error('地图容器尺寸仍为0，无法初始化地图');
          return;
        }
      }
      
      // 检查高德地图API是否已加载
      const AMap = (window as any).AMap;
      if (!AMap) {
        console.error('高德地图API未加载，正在加载...');
        // 检查API密钥是否配置
        if (!import.meta.env.VITE_AMAP_API_KEY) {
          console.error('高德地图API密钥未配置');
          alert('地图初始化失败：请先在.env文件中配置高德地图API密钥');
          return;
        }
        
        // 如果API未加载，尝试重新加载
        const script = document.createElement('script');
        script.src = `https://webapi.amap.com/maps?v=1.4.15&key=${import.meta.env.VITE_AMAP_API_KEY}`;
        script.onload = () => {
          console.log('高德地图API加载完成');
          // 加载完成后，重新尝试初始化地图
          const AMapAfterLoad = (window as any).AMap;
          if (AMapAfterLoad) {
            initMap(AMapAfterLoad);
          } else {
            console.error('高德地图API加载完成但未找到AMap对象');
            alert('地图API加载异常，请刷新页面重试');
          }
        };
        script.onerror = () => {
          console.error('高德地图API加载失败');
          alert('地图API加载失败，请检查网络连接并重试');
        };
        document.head.appendChild(script);
        return;
      }
      
      // 地图初始化函数
      const initMap = (amapInstance: any) => {
        try {
          console.log('开始初始化地图实例');
          
          // 创建地图实例
          mapInstance = new amapInstance.Map(mapContainer, {
            zoom: 12,
            center: [116.397428, 39.90923], // 北京坐标
            resizeEnable: true,
            mapStyle: 'amap://styles/normal',
            lang: 'zh_cn'
          });
          
          console.log('地图实例创建成功:', mapInstance);
          
          // 将地图实例存储到全局变量，以便快速定位功能使用
          (window as any).currentMapInstance = mapInstance;
          
          // 手动触发地图重绘 - 修复resize方法调用错误
          if (typeof mapInstance.resize === 'function') {
            mapInstance.resize();
            console.log('地图已重绘');
          } else {
            console.log('地图实例没有resize方法，跳过重绘');
          }
          
          // 添加默认标记
          marker = new amapInstance.Marker({
            position: [116.397428, 39.90923],
            map: mapInstance,
            title: '默认位置',
            visible: true
          });
          
          // 将标记存储到全局变量
          (window as any).currentMarker = marker;
          
          // 地图点击事件 - 优化处理逻辑
          mapInstance.on('click', async (e: any) => {
            console.log('地图点击事件触发:', e);
            const lng = e.lnglat.getLng();
            const lat = e.lnglat.getLat();
            console.log('选择的经纬度:', lng, lat);
            
            // 清除旧标记
            if (marker) {
              marker.setMap(null);
            }
            
            // 添加新标记
            marker = new amapInstance.Marker({
              position: [lng, lat],
              map: mapInstance,
              title: '您选择的位置',
              visible: true,
              icon: new amapInstance.Icon({
                size: new amapInstance.Size(25, 34),
                image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
                imageSize: new amapInstance.Size(25, 34)
              })
            });
            
            console.log('新标记添加成功');
            
            // 将标记存储到全局变量
            (window as any).currentMarker = marker;
            
            // 逆地理编码获取地址
            amapInstance.plugin('AMap.Geocoder', () => {
              const geocoder = new amapInstance.Geocoder({
                radius: 1000,
                extensions: 'all'
              });
              
              geocoder.getAddress([lng, lat], async (status: string, result: any) => {
                console.log('逆地理编码结果:', status, result);
                let locationName = '';
                
                if (status === 'complete' && result.info === 'OK' && result.regeocode) {
                  locationName = result.regeocode.formattedAddress;
                  console.log('获取到的地址:', locationName);
                } else {
                  console.log('无法获取手动点击位置的地址，尝试搜索附近可选择的位置');
                  
                  // 默认使用经纬度作为名称
                  const defaultName = `位置 (${lng.toFixed(4)}, ${lat.toFixed(4)})`;
                  
                  try {
                    // 尝试搜索附近的POI，获取最近的可选择位置
                    amapInstance.plugin('AMap.PlaceSearch', () => {
                      const placeSearch = new amapInstance.PlaceSearch({
                        pageSize: 1,
                        pageIndex: 1,
                        radius: 500,
                        extensions: 'all'
                      });
                      
                      placeSearch.searchNearBy('餐饮', [lng, lat], 500, (poiStatus: string, poiResult: any) => {
                        if (poiStatus === 'complete' && poiResult.pois && poiResult.pois.length > 0) {
                          const nearestPOI = poiResult.pois[0];
                          locationName = nearestPOI.name || defaultName;
                          console.log('找到最近的可选择位置:', locationName);
                        } else {
                          locationName = defaultName;
                          console.log('没有找到附近的POI，使用经纬度作为名称:', locationName);
                        }
                        
                        // 更新选中位置
                        const newLocation = { lat, lng, name: locationName };
                        setSelectedLocation(newLocation);
                      });
                    });
                    return; // 等待POI搜索结果后再更新位置
                  } catch (error) {
                    console.error('搜索附近POI失败:', error);
                    locationName = defaultName;
                  }
                }
                
                // 更新选中位置
                const newLocation = { lat, lng, name: locationName };
                setSelectedLocation(newLocation);
              });
            });
          });
          
        } catch (error) {
          console.error('地图初始化失败:', error);
          alert('地图初始化失败，请刷新页面重试');
        }
      };
      
      // 延迟初始化，确保模态框完全显示
      setTimeout(() => {
        initMap(AMap);
      }, 300);
      
      // 清理函数
      return () => {
        if (mapInstance) {
          try {
            mapInstance.destroy();
            console.log('地图实例已销毁');
            // 清空全局变量
            delete (window as any).currentMapInstance;
            delete (window as any).currentMarker;
          } catch (error) {
            console.error('销毁地图实例失败:', error);
          }
        }
      };
    }
  }, [showMapModal]);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Utensils className="w-6 h-6 text-orange-400" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">出去吃</h2>
      </div>
      
      {/* 搜索框 */}
      <SearchBar 
        onAddressChange={setAddress}
        onDistanceChange={setSelectedDistance}
        selectedDistance={selectedDistance}
        onSearch={handleSearch}
        onOpenMap={handleOpenMap}
      />
      
      {/* 筛选排序 */}
      <FilterSortBar 
        onCategoryChange={setSelectedCategory}
        onSortChange={setSelectedSort}
        selectedCategory={selectedCategory}
        selectedSort={selectedSort}
      />
      
      {/* 错误提示 */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-xl">
          {error}
        </div>
      )}
      
      {/* 加载中 */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array(6).fill(0).map((_, index) => (
            <div key={index} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden animate-pulse">
              {/* 图片占位符 */}
              <div className="w-full h-36 bg-gray-200 dark:bg-gray-800"></div>
              {/* 信息占位符 */}
              <div className="p-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-4/5 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/5"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 内容展示 */
        <div className="grid grid-cols-2 gap-3">
          {selectedCategory !== '低价菜场' ? (
            restaurants.length > 0 ? (
              restaurants.map(restaurant => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))
            ) : (
              <div className="col-span-2 text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">
                  {address.trim() ? '没有找到相关餐厅' : '请输入地址开始搜索'}
                </p>
                {!address.trim() && (
                  <div className="text-orange-500 dark:text-orange-400 text-3xl font-bold mt-2">
                    （开发ing）
                  </div>
                )}
              </div>
            )
          ) : (
            markets.length > 0 ? (
              markets.map(market => (
                <MarketCard key={market.id} market={market} />
              ))
            ) : (
              <div className="col-span-2 text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">
                  {address.trim() ? '没有找到相关市场' : '请输入地址开始搜索'}
                </p>
                {!address.trim() && (
                  <div className="text-orange-500 dark:text-orange-400 text-3xl font-bold mt-2">
                    （开发ing）
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
      {/* 地图选点模态框 */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">地图选点</h3>
              <div className="flex gap-2">
                {/* 快速定位当前位置按钮 */}
                <button 
                  onClick={handleLocateCurrentPosition} 
                  className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 flex items-center gap-1 px-2 py-1 rounded"
                  title="定位当前位置"
                >
                  📍
                </button>
                <button 
                  onClick={handleCloseMap} 
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="关闭"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* 高德地图容器 */}
            <div ref={mapContainerRef} className="w-full h-[400px] bg-white dark:bg-gray-800 flex-shrink-0"></div>
            
            <div className="p-4 border-t dark:border-gray-800">
              {selectedLocation ? (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{selectedLocation.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      经度: {selectedLocation.lng}, 纬度: {selectedLocation.lat}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      // 确认选择位置
                      setAddress(selectedLocation.name);
                      // 自动触发搜索，显示附近的餐饮信息
                      await handleSearch();
                      // 关闭地图模态框
                      setShowMapModal(false);
                    }}
                    className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                  >
                    确认选择
                  </button>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  请在地图上点击选择位置
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 立即加载高德地图API脚本，确保在组件使用前加载完成
if (typeof window !== 'undefined' && !document.getElementById('amap-script')) {
  const script = document.createElement('script');
  script.id = 'amap-script';
  script.src = `https://webapi.amap.com/maps?v=1.4.15&key=${import.meta.env.VITE_AMAP_API_KEY}`;
  script.async = false; // 同步加载，确保在组件渲染前可用
  script.defer = true; // 延迟执行，不阻塞HTML解析
  script.onload = () => {
    console.log('高德地图API加载完成');
    // API加载完成后触发自定义事件
    window.dispatchEvent(new Event('amap-script-loaded'));
  };
  script.onerror = () => {
    console.error('高德地图API加载失败');
    alert('高德地图API加载失败，请检查网络连接');
  };
  document.head.appendChild(script);
  console.log('正在加载高德地图API:', script.src);
}

export default ChuQuChiPage;
