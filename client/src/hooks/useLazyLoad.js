import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '../lib/api';

export default function useLazyLoad(fetchUrl, options = {}) {
  const {
    initialData = [],
    pageSize = 20,
    enabled = true
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await apiRequest(fetchUrl, 'GET', null, {
        limit: pageSize,
        offset: (page - 1) * pageSize
      });

      const newData = response.data || response.items || response.messages || response.users || [];
      
      setData(prev => [...prev, ...newData]);
      setHasMore(newData.length >= pageSize);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Lazy load error:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchUrl, loading, hasMore, page, pageSize]);

  const refresh = useCallback(async () => {
    setData([]);
    setPage(1);
    setHasMore(true);
    await loadMore();
  }, [loadMore]);

  useEffect(() => {
    if (!enabled) return;

    loadMore();
  }, [enabled, loadMore]);

  const lastElementRef = useCallback((node) => {
    if (loading) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    }, {
      threshold: 0.1,
      rootMargin: '100px'
    });

    if (node) {
      observerRef.current.observe(node);
    }
  }, [loading, hasMore, loadMore]);

  return {
    data,
    loading,
    hasMore,
    loadMore,
    refresh,
    lastElementRef
  };
}
