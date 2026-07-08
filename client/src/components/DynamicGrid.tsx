import { Input, Space, Table } from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import Title from 'antd/es/typography/Title';
import { Search } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import '../styles/DynamicGridStyles.css';

interface DynamicGridProps<RecordType>
  extends Omit<TableProps<RecordType>, 'columns' | 'dataSource' | 'title'> {
  title?: string; // Now seamlessly assignable as a string primitive!
  customHeader?: React.ReactNode; // Now seamlessly assignable as a React node!
  columns: ColumnsType<RecordType>;
  dataSource: RecordType[];
  searchPlaceholder?: string;
  extraHeaderActions?: React.ReactNode;
  enableSearch?: boolean;
  showSerialNumber?: boolean;
}

export function DynamicGrid<RecordType extends object>({
  title,
  customHeader,
  columns,
  dataSource,
  searchPlaceholder = 'Search...',
  extraHeaderActions,
  enableSearch = true,
  showSerialNumber = true,
  ...tableProps
}: DynamicGridProps<RecordType>) {
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

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
    if (!showSerialNumber) return columns;

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
  }, [columns, currentPage, pageSize, showSerialNumber]);

  const defaultScroll = { x: 'max-content', y: '55.5vh' };
  const tableScroll = tableProps.scroll ?? defaultScroll;
  const tableSticky = tableProps.sticky ?? (tableScroll && typeof tableScroll === 'object' && 'y' in tableScroll ? true : undefined);

  return (
    <div
      style={{
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        padding: '12px 16px',
        backgroundColor: 'var(--bg-primary)',
      }}
      
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0 10px 0', }}>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
            <Title level={4} style={{fontWeight: "bolder", fontFamily: "inherit"}}  >
              {title}
            </Title>
          </div>
        )}
        {customHeader && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
            {customHeader}
          </div>
        )}
      </div>

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
        rowClassName={(_record, index) => {
          return index % 2 === 0 ? 'colorful-row-even' : 'colorful-row-odd';
        }}
        scroll={tableScroll}
        sticky={tableSticky}
        pagination={{
          size: "small",
          current: currentPage,
          pageSize: pageSize,
          defaultPageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ['50', '100', '200', '500'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} records`,
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          }
        }}
        rowKey={(record: any) => record.lineId || record.headerId || record.id || Math.random().toString()}
        {...tableProps}
      />
    </div>
  );
}
