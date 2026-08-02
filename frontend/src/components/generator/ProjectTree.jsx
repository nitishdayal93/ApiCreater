import React from 'react';
import { Folder, FileCode, ChevronRight, Download } from 'lucide-react';

export default function ProjectTree({ files, selectedFile, onSelectFile, onDownloadZip }) {
  return (
    <div className="bg-[#0f141c] border border-slate-800/90 rounded-2xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* Header Bar */}
      <div className="h-[52px] bg-[#090d13] border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0">
        <span className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Folder className="w-4 h-4 text-emerald-400" /> PROJECT WORKSPACE TREE
        </span>
        <div className="flex items-center gap-2">
          {onDownloadZip && files.length > 0 && (
            <button
              onClick={onDownloadZip}
              className="flex items-center gap-1.5 text-xs font-black text-black bg-[#00E676] hover:bg-[#00C853] px-3 py-1 rounded-lg transition-all shadow-md shadow-emerald-500/20 active:scale-95"
              title="Download Project ZIP"
            >
              <Download className="w-3.5 h-3.5 stroke-[3]" />
              <span>ZIP</span>
            </button>
          )}
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
            {files.length} Files
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {files.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500 font-medium space-y-1">
            <p className="font-semibold text-slate-400">No files generated yet.</p>
            <p className="text-[11px] text-slate-600">Send a prompt to start.</p>
          </div>
        ) : (
          files.map((file, idx) => {
            const isSelected = selectedFile?.path === file.path;
            return (
              <button
                key={idx}
                onClick={() => onSelectFile(file)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-left transition-all group ${
                  isSelected
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/10 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <FileCode className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className="truncate flex-1">{file.path}</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-opacity ${isSelected ? 'opacity-100 text-emerald-400' : 'opacity-0 group-hover:opacity-100 text-slate-500'}`} />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

