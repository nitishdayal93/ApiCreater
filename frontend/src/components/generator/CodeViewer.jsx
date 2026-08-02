import React, { useState } from 'react';
import { Code, Copy, Check, FileCode, Download } from 'lucide-react';

export default function CodeViewer({ selectedFile }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!selectedFile?.content) return;
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    if (!selectedFile?.content || !selectedFile?.path) return;
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = selectedFile.path.split('/').pop() || 'code.txt';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  const lines = selectedFile?.content ? selectedFile.content.split('\n') : [];

  return (
    <div className="bg-[#0f141c] border border-slate-800/90 rounded-2xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* Code Header Bar */}
      <div className="h-[52px] bg-[#090d13] border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono font-bold text-slate-200">
            {selectedFile?.path || 'No file selected'}
          </span>
        </div>

        {selectedFile && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadFile}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-emerald-400 bg-[#06090e] hover:bg-emerald-500/10 px-3 py-1 rounded-lg transition-colors border border-slate-700/80 hover:border-emerald-500/40 font-bold"
              title="Download this file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-emerald-400 bg-[#06090e] hover:bg-emerald-500/10 px-3 py-1 rounded-lg transition-colors border border-slate-700/80 hover:border-emerald-500/40 font-bold"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Code
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Code Body with Line Numbers */}
      <div className="flex-1 p-4 bg-[#06090e] overflow-auto font-mono text-xs leading-relaxed">
        {selectedFile ? (
          <div className="flex">
            {/* Line Numbers Column */}
            <div className="select-none text-slate-600 text-right pr-4 border-r border-slate-800/80 mr-4 font-mono">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            {/* Code Column */}
            <div className="flex-1 text-slate-200 whitespace-pre">
              {selectedFile.content}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
            <Code className="w-8 h-8 text-slate-600 stroke-[1.5]" />
            <p className="text-xs font-medium text-slate-400">Select a file from the project tree to inspect code</p>
          </div>
        )}
      </div>
    </div>
  );
}

