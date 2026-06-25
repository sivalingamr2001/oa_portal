namespace Backend.Models;

public sealed class PagedResult<T>(List<T> Data, int totalCount, int page, int pageSize)
{
    public List<T> Data { get; } = Data;
    public int TotalCount { get; } = totalCount;
    public int Page { get; } = page;
    public int PageSize { get; } = pageSize;
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasNextPage => Page < TotalPages;
    public bool HasPreviousPage => Page > 1;
}
