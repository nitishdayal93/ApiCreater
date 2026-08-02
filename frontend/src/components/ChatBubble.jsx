import React from 'react';
import { User, Sparkles, CheckCircle2, ChevronDown, ChevronUp, Download } from 'lucide-react';

export default function ChatBubble({ message, onDownloadZip }) {
  const isUser = message.sender === 'user';
  const [showThinking, setShowThinking] = React.useState(true);

  const handleDownload = message.onDownloadZip || onDownloadZip;

  return (
    <div className={`flex gap-4 p-4 rounded-2xl mb-4 transition-all shadow-md ${
      isUser 
        ? 'bg-[#0f141c] border border-slate-800/90' 
        : 'bg-[#090d13] border border-emerald-500/20 shadow-emerald-500/5'
    }`}>
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
        isUser 
          ? 'bg-slate-800 text-slate-300 border border-slate-700/80' 
          : 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 text-black shadow-emerald-500/20 font-bold'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4 stroke-[2.5]" />}
      </div>

      {/* Message Content */}
      <div className="flex-1 overflow-hidden space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-200">
            {isUser ? 'You' : 'API Assistant'}
          </span>
          <span className="text-[10px] font-medium text-slate-500">{message.timestamp || 'Just now'}</span>
        </div>

        {/* AI Thinking Panel if step details exist */}
        {!isUser && message.thinkingSteps && (
          <div className="bg-[#06090e] border border-slate-800/90 rounded-xl p-3 text-xs text-slate-400 space-y-1.5">
            <button 
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center justify-between w-full text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                API Assistant Thinking & Planning Steps
              </span>

              {showThinking ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showThinking && (
              <div className="space-y-1 pt-2 border-t border-slate-800/80">
                {message.thinkingSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Text Body */}
        <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans font-medium">
          {message.content}
        </div>

        {/* Download ZIP Button in Chat Bubble */}
        {!isUser && handleDownload && (message.showDownload || message.onDownloadZip) && (
          <div className="pt-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 bg-[#00E676] hover:bg-[#00C853] text-black font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 active:scale-95"
            >
              <Download className="w-4 h-4 stroke-[3]" />
              <span>Download ZIP Archive</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

