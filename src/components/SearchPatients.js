"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, ListFilter, UserSearch, TextSearch, SearchX } from 'lucide-react';

const SearchPatients = ({ 
  onNavigateToPatientDetails, 
  onNavigateToRegisterPatient,
  onPrintPatient,
  className = ""
}) => {
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  
  // Data and UI state
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // Request cancellation
  const [abortController, setAbortController] = useState(null);

  // Filter options
  const filterOptions = [
    { id: 'all', label: 'All Fields', icon: Search },
    { id: 'name', label: 'By Name', icon: UserSearch },
    { id: 'id', label: 'By ID', icon: TextSearch },
    { id: 'phone', label: 'By Phone', icon: Search },
    { id: 'email', label: 'By Email', icon: Search }
  ];

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search when debounced query or pagination changes
  useEffect(() => {
    if (debouncedQuery || currentPage > 1) {
      performSearch();
    }
  }, [debouncedQuery, currentPage, pageSize, sortField, sortDirection, activeFilter]);

  const performSearch = useCallback(async () => {
    if (!debouncedQuery.trim() && currentPage === 1) {
      setResults([]);
      setTotalResults(0);
      return;
    }

    // Cancel previous request
    if (abortController) {
      abortController.abort();
    }

    const newAbortController = new AbortController();
    setAbortController(newAbortController);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/webhook/clinic-portal/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: debouncedQuery,
          filter: activeFilter,
          page: currentPage,
          pageSize: pageSize,
          sortField: sortField,
          sortDirection: sortDirection
        }),
        signal: newAbortController.signal
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
      setTotalResults(data.total || 0);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Failed to search patients. Please try again.');
        setResults([]);
        setTotalResults(0);
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  }, [debouncedQuery, currentPage, pageSize, sortField, sortDirection, activeFilter, abortController]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setCurrentPage(1);
    setResults([]);
    setTotalResults(0);
    setError(null);
  };

  const retrySearch = () => {
    setError(null);
    performSearch();
  };

  // Calculate pagination
  const totalPages = Math.ceil(totalResults / pageSize);
  const startResult = (currentPage - 1) * pageSize + 1;
  const endResult = Math.min(currentPage * pageSize, totalResults);

  // Loading skeleton rows
  const SkeletonRow = () => (
    <tr className="border-b border-border">
      <td className="px-6 py-4">
        <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-muted animate-pulse rounded-full"></div>
          <div className="h-4 bg-muted animate-pulse rounded w-32"></div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-muted animate-pulse rounded w-28"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-muted animate-pulse rounded w-36"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
      </td>
    </tr>
  );

  return (
    <div className={`bg-card rounded-lg shadow-sm border border-border ${className}`}>
      {/* Search Header */}
      <div className="p-6 border-b border-border">
        <div className="flex flex-col gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search patients by ID, name, phone, email, SA ID, or passport..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <SearchX className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((filter) => {
              const IconComponent = filter.icon;
              return (
                <button
                  key={filter.id}
                  onClick={() => {
                    setActiveFilter(filter.id);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeFilter === filter.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent'
                  }`}
                >
                  <IconComponent className="h-3 w-3" />
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-6 border-b border-border">
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
            <div className="flex items-center justify-between">
              <p className="text-destructive text-sm">{error}</p>
              <button
                onClick={retrySearch}
                className="text-destructive text-sm font-medium hover:underline"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Patient ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Patient
                  {sortField === 'name' && (
                    <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                ID Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Medical Aid
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button
                  onClick={() => handleSort('last_visit')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Last Visit
                  {sortField === 'last_visit' && (
                    <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {loading ? (
              Array.from({ length: pageSize }).map((_, index) => (
                <SkeletonRow key={index} />
              ))
            ) : results.length > 0 ? (
              results.map((patient) => (
                <tr
                  key={patient.id}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => onNavigateToPatientDetails?.(patient.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {patient.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {patient.photo ? (
                          <img
                            src={patient.photo}
                            alt={patient.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-primary font-medium text-sm">
                            {patient.name?.charAt(0) || '?'}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {patient.name} {patient.surname}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {patient.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {patient.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    <div>
                      <span className="text-xs text-muted-foreground uppercase">
                        {patient.id_type}
                      </span>
                      <div>{patient.id_value}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {patient.medical_aid ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {patient.last_visit ? (
                      new Date(patient.last_visit).toLocaleDateString()
                    ) : (
                      <span className="text-muted-foreground">No visits</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToPatientDetails?.(patient.id);
                        }}
                        className="text-primary hover:text-primary/80 font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPrintPatient?.(patient.id);
                        }}
                        className="text-muted-foreground hover:text-foreground"
                        title="Quick Print"
                      >
                        📄
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : !loading && debouncedQuery ? (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <SearchX className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <h3 className="text-lg font-medium text-foreground">No patients found</h3>
                      <p className="text-muted-foreground">
                        No patients match your search criteria. Try adjusting your search terms.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <UserSearch className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <h3 className="text-lg font-medium text-foreground">Search for patients</h3>
                      <p className="text-muted-foreground mb-4">
                        Enter a search term above to find patients by ID, name, phone, email, or ID number.
                      </p>
                      <button
                        onClick={() => onNavigateToRegisterPatient?.()}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
                      >
                        Register New Patient
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalResults > 0 && (
        <div className="px-6 py-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Showing {startResult}-{endResult} of {totalResults} results
              </p>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="bg-background border border-input rounded px-2 py-1 text-sm"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-input rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent transition-colors"
              >
                Previous
              </button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 border text-sm rounded transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-input hover:bg-accent'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-input rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPatients;