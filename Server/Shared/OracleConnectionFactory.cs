using System.Data;
using System.Threading;
using System.Threading.Tasks;
using Oracle.ManagedDataAccess.Client;

namespace Backend.Shared;

public sealed class OracleConnectionFactory : IDbConnectionFactory
{
    private readonly string _defaultConnectionString;

    public OracleConnectionFactory(string defaultConnectionString)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(defaultConnectionString);
        _defaultConnectionString = defaultConnectionString;
    }

    public Task<IDbConnection> CreateConnectionAsync(CancellationToken cancellationToken = default)
        => CreateConnectionAsync(_defaultConnectionString, cancellationToken);

    public async Task<IDbConnection> CreateConnectionAsync(string connectionString, CancellationToken cancellationToken = default)
    {
        var conn = new OracleConnection(connectionString);
        await conn.OpenAsync(cancellationToken).ConfigureAwait(false);
        return conn;
    }
}
