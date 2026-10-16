import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalPages,
  totalItems,
  totalCount,
  total,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}) {
  const actualItems = totalItems ?? totalCount ?? total ?? 0;
  const pagesCount = totalPages ?? Math.max(1, Math.ceil(actualItems / (pageSize || 10)));

  if (actualItems <= 0 && pagesCount <= 1) return null;

  const startItem = actualItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, actualItems);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    const pages = [];
    if (pagesCount <= 5) {
      for (let i = 1; i <= pagesCount; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', pagesCount);
      } else if (currentPage >= pagesCount - 2) {
        pages.push(1, '...', pagesCount - 3, pagesCount - 2, pagesCount - 1, pagesCount);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', pagesCount);
      }
    }
    return pages;
  };

  return (
    <div className="pagination-wrapper">
      <div className="pagination-info">
        <span>
          Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of <strong>{actualItems}</strong> entries
        </span>

        {onPageSizeChange && (
          <div className="pagination-pagesize-wrap">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Per page:</span>
            <select
              className="pagination-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="pagination-controls">
        {/* First Page */}
        <button
          className="pagination-btn"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title="First page"
          type="button"
        >
          <ChevronsLeft size={15} />
        </button>

        {/* Previous Page */}
        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Previous page"
          type="button"
        >
          <ChevronLeft size={15} />
          <span className="pagination-btn-label">Prev</span>
        </button>

        {/* Page Numbers */}
        <div className="pagination-pages-list">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                  …
                </span>
              );
            }
            const isActive = p === currentPage;
            return (
              <button
                key={p}
                className={`pagination-num-btn ${isActive ? 'active' : ''}`}
                onClick={() => onPageChange(p)}
                type="button"
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= pagesCount}
          title="Next page"
          type="button"
        >
          <span className="pagination-btn-label">Next</span>
          <ChevronRight size={15} />
        </button>

        {/* Last Page */}
        <button
          className="pagination-btn"
          onClick={() => onPageChange(pagesCount)}
          disabled={currentPage >= pagesCount}
          title="Last page"
          type="button"
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );
}
