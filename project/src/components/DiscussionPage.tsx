import React from 'react';
import { MessageCircle } from 'lucide-react';

const DiscussionPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12">
      <div className="flex items-center gap-2 mb-8">
        <MessageCircle className="w-6 h-6 text-orange-400" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">讨论</h2>
      </div>
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 text-center">
        <h3 className="text-3xl font-bold text-orange-400 mb-4">开发中……</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          讨论功能正在紧张开发中，敬请期待！
        </p>
        <div className="text-xs text-gray-500 dark:text-gray-500">
          💡 即将推出：美食话题、心得分享、点赞评论等功能
        </div>
      </div>
    </div>
  );
};

export default DiscussionPage;
