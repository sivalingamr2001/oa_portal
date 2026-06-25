import { LoadingOutlined } from '@ant-design/icons';
import { Space, Spin, Typography } from 'antd';

const { Text } = Typography;

interface LoaderProps {
  isText?: boolean;
  tip?: string; // Added a flexible tip prop for custom messages
}

export function Loader({ isText = true, tip = "Loading..." }: LoaderProps) {
  // Use Ant Design's recommended custom spinner icon indicator
  const antIcon = <LoadingOutlined style={{ fontSize: isText ? 20 : 16 }} spin />;

  // Full-screen overlay modal structure when text/backdrop mode is active
  if (isText) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000, // Matches Ant Design's highest structural level layers
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.45)', // Standard translucent overlay backdrop
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      >
        <Space
          align="center"
          size={16}
          style={{
            backgroundColor: '#141414', // High-contrast solid dark foreground surface sheet
            padding: '14px 24px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 6px 16px -8px rgba(0, 0, 0, 0.08), 0 9px 28px 0 rgba(0, 0, 0, 0.05), 0 12px 48px 16px rgba(0, 0, 0, 0.03)',
          }}
        >
          <Spin indicator={antIcon} style={{ color: '#fff' }} />
          <Text style={{ color: '#fff', fontSize: '14px', fontWeight: 600, letterSpacing: '-0.01em' }}>
            {tip}
          </Text>
        </Space>
      </div>
    );
  }

  // Fallback small inline spinner structure layout block
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <Space
          align="center"
          size={16}
          style={{
            backgroundColor: '#141414', // High-contrast solid dark foreground surface sheet
            padding: '14px 24px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 6px 16px -8px rgba(0, 0, 0, 0.08), 0 9px 28px 0 rgba(0, 0, 0, 0.05), 0 12px 48px 16px rgba(0, 0, 0, 0.03)',
          }}
        >
          <Spin indicator={antIcon} style={{ color: '#fff' }} />
          <Text style={{ color: '#fff', fontSize: '14px', fontWeight: 600, letterSpacing: '-0.01em' }}>
            {tip}
          </Text>
        </Space>
    </div>
  );
}
