import React, { useState } from 'react';

const treeData = {
  id: 'root',
  name: 'Modul PM SAP PTPN',
  level: 'L0',
  color: '#064e3b', 
  textColor: '#ffffff',
  borderColor: '#064e3b',
  dotColor: '#34d399',
  children: [
    {
      id: 'pm01',
      name: 'PM01 Corrective Maintenance',
      level: 'L1',
      color: '#fffbeb', // Amber 50
      textColor: '#92400e', // Amber 900
      borderColor: '#fde68a', // Amber 200
      dotColor: '#f59e0b',
      children: [
        { id: 'pm01-1', name: 'Notifikasi M2 (Auto)', level: 'L2', color: '#fffbeb', textColor: '#92400e', borderColor: '#fde68a', dotColor: '#f59e0b' },
        { id: 'pm01-2', name: 'Input Catalog Data', level: 'L2', color: '#fffbeb', textColor: '#92400e', borderColor: '#fde68a', dotColor: '#f59e0b' },
        { id: 'pm01-3', name: 'Create Order (IW31)', level: 'L2', color: '#fffbeb', textColor: '#92400e', borderColor: '#fde68a', dotColor: '#f59e0b' },
        { id: 'pm01-4', name: 'Release Order (IW32)', level: 'L2', color: '#fffbeb', textColor: '#92400e', borderColor: '#fde68a', dotColor: '#f59e0b' },
      ]
    },
    {
      id: 'pm02',
      name: 'PM02 Preventive Maintenance',
      level: 'L1',
      color: '#eff6ff', // Blue 50
      textColor: '#1e3a8a', // Blue 900
      borderColor: '#bfdbfe', // Blue 200
      dotColor: '#3b82f6',
      children: [
        { id: 'pm02-1', name: 'Strategy & Tasklist (IP11)', level: 'L2', color: '#eff6ff', textColor: '#1e3a8a', borderColor: '#bfdbfe', dotColor: '#3b82f6' },
        { id: 'pm02-2', name: 'Maint. Item & Plan (IP04/IP42)', level: 'L2', color: '#eff6ff', textColor: '#1e3a8a', borderColor: '#bfdbfe', dotColor: '#3b82f6' },
        { id: 'pm02-3', name: 'Penjadwalan & Running (IP30)', level: 'L2', color: '#eff6ff', textColor: '#1e3a8a', borderColor: '#bfdbfe', dotColor: '#3b82f6' },
        { id: 'pm02-4', name: 'Terbentuk Order & Cek (IP24)', level: 'L2', color: '#eff6ff', textColor: '#1e3a8a', borderColor: '#bfdbfe', dotColor: '#3b82f6' },
      ]
    },
    {
      id: 'pm04',
      name: 'PM04 Investment Order',
      level: 'L1',
      color: '#fdf2f8', // Pink 50
      textColor: '#9d174d', // Pink 900
      borderColor: '#fbcfe8', // Pink 200
      dotColor: '#ec4899',
      children: [
        { id: 'pm04-1', name: 'Project Def. & WBS (CJ20N)', level: 'L2', color: '#fdf2f8', textColor: '#9d174d', borderColor: '#fbcfe8', dotColor: '#ec4899' },
        { id: 'pm04-2', name: 'Setting & Release Budget', level: 'L2', color: '#fdf2f8', textColor: '#9d174d', borderColor: '#fbcfe8', dotColor: '#ec4899' },
        { id: 'pm04-3', name: 'Create & Assign Order (IW31)', level: 'L2', color: '#fdf2f8', textColor: '#9d174d', borderColor: '#fbcfe8', dotColor: '#ec4899' },
        { id: 'pm04-4', name: 'PR, PO, SES (ME53N, ME21N)', level: 'L2', color: '#fdf2f8', textColor: '#9d174d', borderColor: '#fbcfe8', dotColor: '#ec4899' },
        { id: 'pm04-5', name: 'Settlement & Asset (KO88, CJ88)', level: 'L2', color: '#fdf2f8', textColor: '#9d174d', borderColor: '#fbcfe8', dotColor: '#ec4899' },
      ]
    },
    {
      id: 'closing',
      name: 'Konfirmasi & Closing',
      level: 'L1',
      color: '#f0fdf4', // Green 50
      textColor: '#14532d', // Green 900
      borderColor: '#86efac', // Green 200
      dotColor: '#22c55e',
      children: [
        { id: 'cl-1', name: 'Eksekusi & Konfirmasi (IW41)', level: 'L2', color: '#f0fdf4', textColor: '#14532d', borderColor: '#86efac', dotColor: '#22c55e' },
        { id: 'cl-2', name: 'Penyelesaian Teknis / TECO', level: 'L2', color: '#f0fdf4', textColor: '#14532d', borderColor: '#86efac', dotColor: '#22c55e' },
      ]
    }
  ]
};

const VerticalDendrogramNode = ({ node, isRoot = false }) => {
  const [isExpanded, setIsExpanded] = useState(
    node.level === 'L0' || node.level === 'L1'
  );
  
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div 
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
        className={`relative flex items-center justify-center px-3 py-1.5 rounded-md shadow-sm z-10 transition-all ${hasChildren ? 'cursor-pointer hover:shadow-md hover:ring-2 hover:ring-slate-200' : 'cursor-default'}`}
        style={{ 
          backgroundColor: node.color || '#ffffff', 
          minWidth: '170px',
          maxWidth: '170px', 
          height: '46px', 
          border: `1px solid ${node.borderColor || '#e2e8f0'}`
        }}
      >
        <div 
          className="absolute left-2 w-1.5 h-1.5 rounded-full" 
          style={{ backgroundColor: node.dotColor || '#f97316' }}
        ></div>
        <div className="absolute top-0.5 left-4 text-[7.5px] font-bold text-slate-500 tracking-wider">
          {node.level}
        </div>
        <span className="text-slate-900 text-[11px] font-bold text-center px-1 leading-snug" style={{ color: node.textColor || '#0f172a' }}>
          {node.name}
        </span>
        {/* Expand/Collapse Indicator */}
        {hasChildren && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border border-slate-300 rounded-full flex items-center justify-center shadow-sm z-20">
            <span className="text-slate-600 text-[10px] font-bold leading-none pb-0.5">{isExpanded ? '-' : '+'}</span>
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col items-center">
          {/* Vertical Connector from parent down to the horizontal spine */}
          <div className="w-px h-6 bg-slate-300"></div>
          
          {/* Children container (Row) */}
          <div className="relative flex flex-row pt-0 px-0">
            {node.children.map((child, i) => {
              const isFirst = i === 0;
              const isLast = i === node.children.length - 1;
              const isOnly = node.children.length === 1;

              return (
                <div key={i} className="relative flex flex-col items-center px-2 sm:px-4">
                  {/* Horizontal line segment for this child (The spine) */}
                  {!isOnly && (
                    <div 
                      className="absolute top-0 h-px bg-slate-300"
                      style={{
                        left: isFirst ? '50%' : '0',
                        right: isLast ? '50%' : '0'
                      }}
                    ></div>
                  )}
                  {/* Vertical line from spine down to child */}
                  <div className="w-px h-6 bg-slate-300"></div>
                  
                  <VerticalDendrogramNode node={child} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default function VerticalFlow() {
  return (
    <div className="w-full overflow-x-auto pt-4 pb-8 px-2">
      <div className="p-4 min-w-max flex justify-center">
        <VerticalDendrogramNode node={treeData} isRoot={true} />
      </div>
    </div>
  );
}
