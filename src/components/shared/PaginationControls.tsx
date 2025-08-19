
// src/components/shared/PaginationControls.tsx
"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationControlsProps) {
  const MAX_VISIBLE_PAGES = 5; // Max number of page buttons to show (excluding Prev/Next/Ellipses)

  const getPageNumbers = () => {
    const pageNumbers: (number | string)[] = [];
    if (totalPages <= MAX_VISIBLE_PAGES + 2) { // Show all if total is small enough
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1); // Always show first page

      let startPage = Math.max(2, currentPage - Math.floor((MAX_VISIBLE_PAGES - 2) / 2));
      let endPage = Math.min(totalPages - 1, currentPage + Math.ceil((MAX_VISIBLE_PAGES - 2) / 2) -1 );
      
      // Adjust if near the beginning
      if (currentPage <= Math.ceil(MAX_VISIBLE_PAGES/2)) {
        endPage = Math.min(totalPages -1, MAX_VISIBLE_PAGES-1);
        startPage = 2;
      }
      // Adjust if near the end
      if (currentPage > totalPages - Math.ceil(MAX_VISIBLE_PAGES/2)) {
         startPage = Math.max(2, totalPages - MAX_VISIBLE_PAGES +2);
         endPage = totalPages -1;
      }


      if (startPage > 2) {
        pageNumbers.push("...");
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      if (endPage < totalPages - 1) {
        pageNumbers.push("...");
      }
      
      if (totalPages > 1) pageNumbers.push(totalPages); // Always show last page if not 1
    }
    return pageNumbers;
  };

  const pageNumbersToDisplay = getPageNumbers();

  return (
    <div className="flex items-center space-x-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Go to previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pageNumbersToDisplay.map((page, index) =>
        typeof page === "number" ? (
          <Button
            key={index}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
            className={cn("h-9 w-9 p-0 text-xs", currentPage === page && "font-bold")}
            aria-label={`Go to page ${page}`}
            aria-current={currentPage === page ? "page" : undefined}
          >
            {page}
          </Button>
        ) : (
          <span key={index} className="px-1.5 py-1 text-xs text-muted-foreground">
            {page} {/* Ellipsis */}
          </span>
        )
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Go to next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
