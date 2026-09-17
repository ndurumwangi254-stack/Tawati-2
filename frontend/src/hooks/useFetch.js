import { useCallback, useEffect, useState } from 'react'

// deps lets a page re-fetch when something it depends on changes
// (a filter, a search term already debounced elsewhere, etc.)
export function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetcher()
      .then((result) => setData(result))
      .catch((err) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    load()
  }, [load])

  return { data, setData, loading, error, refetch: load }
}
