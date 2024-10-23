const mockFetch = async (url: string) => fetch(`http://localhost:3000${url}`);

export default mockFetch;
