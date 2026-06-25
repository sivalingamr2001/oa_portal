import React from 'react';
import { Radio } from 'antd';

interface FilterHeaderProps {
    activeFilter: string;
    setActiveFilter: (filter: string) => void;
    filteredCount: number;
}

export const FilterHeader: React.FC<FilterHeaderProps> = ({
    activeFilter,
    setActiveFilter
}) => {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
    };

    const getButtonStyle = (value: string): React.CSSProperties => {
        const isActive = activeFilter === value;
        return {
            backgroundColor: isActive ? 'var(--primary-color)' : 'var(--bg-primary)',
            color: isActive ? 'var(--primary-foreground)' : 'var(--text-primary)',
            borderColor: isActive ? 'none' : 'var(--border-color)',
        };
    };

    return (
        <div style={containerStyle}>
            <Radio.Group
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                optionType="button"
                buttonStyle="solid"
                size='small'
            >
                <Radio.Button value="ALL" style={getButtonStyle("ALL")}>
                    All
                </Radio.Button>

                <Radio.Button value="PENDING" style={getButtonStyle("PENDING")}>
                    Pendings
                </Radio.Button>

                <Radio.Button value="APPROVED" style={getButtonStyle("APPROVED")}>
                    Approved
                </Radio.Button>

                <Radio.Button value="CANCELLED" style={getButtonStyle("CANCELLED")}>
                    Cancelled
                </Radio.Button>

                <Radio.Button value="OPEN_POOL" style={getButtonStyle("OPEN_POOL")}>
                    Open Pool
                </Radio.Button>

                <Radio.Button value="CUSTOMER" style={getButtonStyle("CUSTOMER")}>
                    Customer Based
                </Radio.Button>
            </Radio.Group>
        </div>
    );
};
