import React, { useState, useMemo } from 'react';
import { Table, Input, Card, Space } from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import { Search } from 'lucide-react';
import '../styles/DynamicGridStyles.css'; // Importing the style properties below

interface DynamicGridProps<RecordType> extends Omit<TableProps<RecordType>, 'columns' | 'dataSource'> {
  columns: ColumnsType<RecordType>;
  dataSource: RecordType[];
  searchPlaceholder?: string;
  extraHeaderActions?: React.ReactNode;
  enableSearch?: boolean;
}

export function DynamicGrid<RecordType extends object>({
  columns,
  dataSource,
  searchPlaceholder = 'Search...',
  extraHeaderActions,
  enableSearch = true,
  ...tableProps
}: DynamicGridProps<RecordType>) {
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredData = useMemo(() => {
    if (!searchText) return dataSource;
    const lowerSearch = searchText.toLowerCase();

    return dataSource.filter((record) => {
      return Object.values(record).some((value) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'object') return false;
        return String(value).toLowerCase().includes(lowerSearch);
      });
    });
  }, [dataSource, searchText]);

  const columnsWithSNo = useMemo(() => {
    const snoColumn: ColumnsType<RecordType>[number] = {
      title: 'S.No',
      key: 'serialNumber',
      width: 70,
      align: 'center',
      fixed: 'left',
      className: 'sno-header-cell',
      render: (_text, _record, index) => {
        return (currentPage - 1) * pageSize + index + 1;
      },
    };
    return [snoColumn, ...columns];
  }, [columns, currentPage, pageSize]);

  return (
    <Card 
      className="colorful-grid-card" 
      style={{ 
        borderRadius: 16, 
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}
    >
      {(enableSearch || extraHeaderActions) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12, padding: '4px 4px 0 4px' }}>
          {enableSearch ? (
            <Input
              placeholder={searchPlaceholder}
              prefix={<Search size={16} style={{ color: '#94a3b8' }} />}
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
              allowClear
              style={{ maxWidth: 320, borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
          ) : (
            <div />
          )}
          <Space>{extraHeaderActions}</Space>
        </div>
      )}

      <Table
        columns={columnsWithSNo}
        dataSource={filteredData}
        size='small'
        // Alternate raw class names based on index row oddity checks
        rowClassName={(_record, index) => {
          return index % 2 === 0 ? 'colorful-row-even' : 'colorful-row-odd';
        }}
        className="premium-custom-table"
        pagination={{
          size: "small",
          current: currentPage,
          pageSize: pageSize,
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['5', '10', '20', '50'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} records`,
          style: { marginTop: 16, paddingRight: 8 },
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          }
        }}
        rowKey={(record: any) => record.lineId || record.headerId || record.id || Math.random().toString()}
        scroll={{ x: 'max-content', y: '55.5vh' }}
        {...tableProps}
      />
    </Card>
  );
}
