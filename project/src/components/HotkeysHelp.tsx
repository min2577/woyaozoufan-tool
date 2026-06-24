import { X, Keyboard } from 'lucide-react';

interface HotkeysHelpProps {
  onClose: () => void;
}

const hotkeys = [
  {
    category: '操作',
    items: [
      { keys: ['Ctrl', 'Enter'], desc: '生成菜谱' },
      { keys: ['Ctrl', 'K'], desc: '搜索食材' },
      { keys: ['Ctrl', 'F'], desc: '打开收藏夹' },
      { keys: ['Ctrl', 'B'], desc: '脑洞模式开关' },
    ]
  },
  {
    category: '导航',
    items: [
      { keys: ['1'], desc: '肉类食材' },
      { keys: ['2'], desc: '蔬菜食材' },
      { keys: ['3'], desc: '主食食材' },
      { keys: ['4'], desc: '水果食材' },
      { keys: ['5'], desc: '其他食材' },
      { keys: ['Escape'], desc: '关闭弹窗/抽屉' },
    ]
  },
  {
    category: '列表',
    items: [
      { keys: ['↑'], desc: '上一个菜谱' },
      { keys: ['↓'], desc: '下一个菜谱' },
      { keys: ['Enter'], desc: '打开菜谱详情' },
    ]
  }
];

export default function HotkeysHelp({ onClose }: HotkeysHelpProps) {
  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 弹窗 */}
      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hotkeys-title"
      >
        <div className="bg-gray-900 rounded-3xl shadow-2xl border border-gray-700 overflow-hidden animate-scale-bounce">
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-xl">
                <Keyboard className="w-6 h-6 text-orange-400" />
              </div>
              <h2 id="hotkeys-title" className="text-xl font-black text-white">
                快捷键速查
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label="关闭快捷键帮助"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* 内容 */}
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {hotkeys.map((group, idx) => (
              <div key={idx}>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                  {group.category}
                </h3>
                <div className="space-y-2">
                  {group.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                    >
                      <span className="text-sm text-gray-300">{item.desc}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((key, keyIdx) => (
                          <kbd
                            key={keyIdx}
                            className="px-2 py-1 bg-gray-800 border border-gray-700 rounded-lg text-xs font-mono text-gray-300"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 底部提示 */}
          <div className="p-4 bg-gray-800/50 border-t border-gray-800">
            <p className="text-xs text-gray-400 text-center">
              💡 提示：在输入框内时，部分快捷键会被禁用
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
