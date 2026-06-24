import React, { useState, useEffect } from 'react';
import { User, Heart, Trash2, X } from 'lucide-react';

const ProfilePage = () => {
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('favorites');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  const handleClearFavorites = () => {
    setFavorites({});
    localStorage.removeItem('favorites');
  };

  const favoriteRecipes = Object.keys(favorites).filter(k => favorites[k]);

  return (
    <div className="flex flex-col items-center justify-center h-full py-12 p-4">
      <div className="flex items-center gap-2 mb-8">
        <User className="w-6 h-6 text-orange-400" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">我的</h2>
      </div>
      
      <div className="w-full max-w-md space-y-4">
        {/* 收藏夹卡片 */}
        <div 
          className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setShowFavorites(true)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900 flex items-center justify-center">
                <Heart className="w-6 h-6 text-pink-500" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-gray-900 dark:text-white">我的收藏</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  已收藏 {favoriteRecipes.length} 道菜谱
                </p>
              </div>
            </div>
            <span className="text-gray-400">›</span>
          </div>
        </div>

        {/* 其他功能占位 */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 opacity-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <span className="text-gray-400">📊</span>
              </div>
              <div className="text-left">
                <h3 className="font-bold text-gray-900 dark:text-white">历史记录</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">开发中……</p>
              </div>
            </div>
            <span className="text-gray-400">›</span>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 opacity-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <span className="text-gray-400">⚙️</span>
              </div>
              <div className="text-left">
                <h3 className="font-bold text-gray-900 dark:text-white">设置</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">开发中……</p>
              </div>
            </div>
            <span className="text-gray-400">›</span>
          </div>
        </div>
      </div>

      {/* 收藏夹弹窗 */}
      {showFavorites && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-xl">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                <span className="font-bold text-gray-900 dark:text-white">我的收藏</span>
              </div>
              <div className="flex items-center gap-2">
                {favoriteRecipes.length > 0 && (
                  <button
                    onClick={handleClearFavorites}
                    className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-600 dark:text-red-400 rounded flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    清空
                  </button>
                )}
                <button onClick={() => setShowFavorites(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
              {favoriteRecipes.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">还没有收藏任何菜谱</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">去发现美味菜谱吧！</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {favoriteRecipes.map((name) => (
                    <div 
                      key={name} 
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-between"
                    >
                      <span className="text-gray-900 dark:text-white">{name}</span>
                      <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
