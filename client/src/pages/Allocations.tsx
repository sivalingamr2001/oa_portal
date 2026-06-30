import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  DatePicker,
  Divider,
  Form,
  Input,
  message,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Tag,
  Typography
} from 'antd';
import { Database, FileText, MapPin, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  Customer,
  CustomerAddress,
  InventoryItem,
  OperatingUnit,
  Organization,
  Region
} from '../api/allocationApi';
import {
  createAllocation,
  getBillToCustomers,
  getCustomerAddresses,
  getDemandMetrics,
  getItems,
  getOperatingUnits,
  getOrganizationsByOuId,
  getRegions,
  getRrsCategory,
  getShipToCustomers
} from '../api/allocationApi';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import '../styles/Allocations.css';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface LineItemState {
  id: string;
  organizationId: number | null;
  inventoryItemId: number | null;
  itemCode: string;
  description: string;
  week: string;
  b3Quantity: number;
  targetDate: string;
  oaPendingQuantity?: number;
  oaRsvQty?: number;
  oaPickedQty?: number;
  binQty?: number;
  binRsvQty?: number;
  rrsCategory?: string;
  rrsError?: boolean;
}

export const Allocations = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const [form] = Form.useForm();
  const { currentUser, currentRegion } = useAuth();

  useEffect(() => {
    if (currentRegion) {
      setSelectedRegion(currentRegion.region);
    }
  }, [currentRegion]);

  const [regions, setRegions] = useState<Region[]>([]);
  const [operatingUnits, setOperatingUnits] = useState<OperatingUnit[]>([]);
  const [billToCustomers, setBillToCustomers] = useState<Customer[]>([]);
  const [shipToCustomers, setShipToCustomers] = useState<Customer[]>([]);
  const [billToAddresses, setBillToAddresses] = useState<CustomerAddress[]>([]);
  const [shipToAddresses, setShipToAddresses] = useState<CustomerAddress[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedSubRegion, setSelectedSubRegion] = useState<string>('');
  const [selectedOU, setSelectedOU] = useState<number | null>(null);
  const [selectedBillToCustomer, setSelectedBillToCustomer] = useState<number | null>(null);
  const [selectedShipToCustomer, setSelectedShipToCustomer] = useState<number | null>(null);
  const [loadingShipToCustomers, setLoadingShipToCustomers] = useState(false);
  const [billToAddressDetail, setBillToAddressDetail] = useState<string>('');
  const [shipToAddressDetail, setShipToAddressDetail] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [lines, setLines] = useState<LineItemState[]>([
    { id: '1', organizationId: null, inventoryItemId: null, itemCode: '', description: '', week: '', b3Quantity: 0, targetDate: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [activePanel, setActivePanel] = useState<string | string[]>(['header']);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [regionsData, ouData, itemsData] = await Promise.all([
          getRegions(),
          getOperatingUnits(),
          getItems(1, 50, searchTerm, lines.find(l => l.organizationId)?.organizationId || undefined),
        ]);
        setRegions(regionsData);
        setOperatingUnits(ouData);
        setItems(itemsData.data);
      } catch (err) {
        message.error('Failed to load form lookup data.');
      }
    };
    loadInitialData();
  }, [searchTerm]);

  useEffect(() => {
    if (!selectedOU) {
      setOrganizations([]);
      return;
    }
    const loadOrganizations = async () => {
      try {
        const orgs = await getOrganizationsByOuId(selectedOU);
        setOrganizations(orgs);
      } catch (err) {
        message.error('Failed to load organizations for selected operating unit.');
      }
    };
    loadOrganizations();
  }, [selectedOU]);

  const uniqueRegions = useMemo(() => {
    return Array.from(new Set(regions.map(r => r.region)));
  }, [regions]);

  const subRegions = useMemo(() => {
    if (!selectedRegion) return [];
    return regions
      .filter(r => r.region === selectedRegion)
      .flatMap(r => r.subRegion ? r.subRegion.split(',') : [])
      .map(item => item.trim());
  }, [regions, selectedRegion]);

  useEffect(() => {
    if (!selectedRegion || !selectedSubRegion) return;
    const loadBillToCustomers = async () => {
      try {
        const billTo = await getBillToCustomers(selectedRegion, selectedSubRegion, selectedOU);
        setBillToCustomers(billTo);
        form.setFieldsValue({ billToCustomer: null, shipToCustomer: null });
        setSelectedBillToCustomer(null);
        setSelectedShipToCustomer(null);
        setBillToAddresses([]);
        setShipToAddresses([]);
        setBillToAddressDetail('');
        setShipToAddressDetail('');
        setShipToCustomers([]);
      } catch (err) {
        message.error('Failed to fetch customers for selected region.');
      }
    };
    loadBillToCustomers();
  }, [selectedRegion, selectedSubRegion, selectedOU]);

  const loadShipToCustomers = async () => {
    try {
      const shipTo = await getShipToCustomers(selectedOU, selectedBillToCustomer);
      setShipToCustomers(shipTo);
    } catch (err) {
      message.error('Failed to fetch ship-to customers.');
    }
  };

  useEffect(() => {
    if (!selectedOU || !selectedBillToCustomer) {
      setShipToCustomers([]);
      return;
    }
    loadShipToCustomers();
  }, [selectedOU, selectedBillToCustomer]);

  useEffect(() => {
    if (!selectedBillToCustomer || !selectedOU) return;
    const fetchBillToAddresses = async () => {
      try {
        const addrs = await getCustomerAddresses(selectedBillToCustomer, 'BILL_TO', selectedOU);
        setBillToAddresses(addrs);
        form.setFieldsValue({ billToLocation: null });
        setBillToAddressDetail('');
      } catch (err) {
        message.error('Failed to load bill-to locations.');
      }
    };
    fetchBillToAddresses();
  }, [selectedBillToCustomer, selectedOU]);

  useEffect(() => {
    if (!selectedShipToCustomer || !selectedOU) return;
    const fetchShipToAddresses = async () => {
      try {
        const addrs = await getCustomerAddresses(selectedShipToCustomer, 'SHIP_TO', selectedOU);
        setShipToAddresses(addrs);
        form.setFieldsValue({ shipToLocation: null });
        setShipToAddressDetail('');
      } catch (err) {
        message.error('Failed to load ship-to locations.');
      }
    };
    fetchShipToAddresses();
  }, [selectedShipToCustomer, selectedOU]);

  const handleBillToLocationSelect = (locName: string) => {
    const address = billToAddresses.find(a => a.location === locName);
    if (address) {
      setBillToAddressDetail(`${address.address1}, ${address.address2 || ''} ${address.address3 || ''}, ${address.city} - ${address.postalCode}`);
    }
  };

  const handleShipToLocationSelect = (locName: string) => {
    const address = shipToAddresses.find(a => a.location === locName);
    if (address) {
      setShipToAddressDetail(`${address.address1}, ${address.address2 || ''} ${address.address3 || ''}, ${address.city} - ${address.postalCode}`);
    }
  };

  const addLineRow = () => {
    const newId = (lines.length + 1).toString();
    setLines([...lines, { id: newId, organizationId: null, inventoryItemId: null, itemCode: '', description: '', week: '', b3Quantity: 0, targetDate: '' }]);
  };

  const removeLineRow = (id: string) => {
    if (lines.length === 1) {
      message.warning('At least one line item is required.');
      return;
    }
    setLines(lines.filter(l => l.id !== id));
  };

  const handleClearAll = () => {
    Modal.confirm({
      title: 'Clear All Fields',
      content: 'Are you sure you want to clear all fields and reset the form?',
      okText: 'Clear',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        form.resetFields();
        form.setFieldsValue({ optionType: 'Customer Specific' });
        setSelectedRegion(currentRegion?.region || '');
        setSelectedSubRegion('');
        setSelectedOU(null);
        setSelectedBillToCustomer(null);
        setSelectedShipToCustomer(null);
        setBillToAddressDetail('');
        setShipToAddressDetail('');
        setBillToAddresses([]);
        setShipToAddresses([]);
        setBillToCustomers([]);
        setShipToCustomers([]);
        setLines([
          { id: '1', organizationId: null, inventoryItemId: null, itemCode: '', description: '', week: '', b3Quantity: 0, targetDate: '' }
        ]);
        setSearchTerm('');
        message.success('All fields have been cleared.');
      }
    });
  };

  const clearLine = (id: string) => {
    setLines(prevLines =>
      prevLines.map(line =>
        line.id === id
          ? { id: line.id, organizationId: null, inventoryItemId: null, itemCode: '', description: '', week: '', b3Quantity: 0, targetDate: '' }
          : line
      )
    );
  };

  const updateLineRow = async (id: string, field: keyof LineItemState, value: any) => {
    const updated = await Promise.all(lines.map(async (line) => {
      if (line.id !== id) return line;
      const updatedLine = { ...line, [field]: value } as LineItemState;
      if (field === 'inventoryItemId') {
        const itemObj = items.find(i => i.inventoryItemId === value);
        if (itemObj) {
          updatedLine.itemCode = itemObj.itemCode;
          updatedLine.description = itemObj.description;
        }
      }
      if (
        (field === 'inventoryItemId' || field === 'organizationId') &&
        updatedLine.inventoryItemId &&
        updatedLine.organizationId
      ) {
        try {
          const rrs = await getRrsCategory(updatedLine.organizationId, updatedLine.inventoryItemId);
          updatedLine.rrsCategory = rrs.rrsCategory;
          updatedLine.rrsError = rrs.rrsCategory === 'Rn';
          if (selectedBillToCustomer && !updatedLine.rrsError) {
            const metrics = await getDemandMetrics(
              selectedBillToCustomer,
              updatedLine.organizationId,
              updatedLine.inventoryItemId
            );
            updatedLine.oaPendingQuantity = metrics.oaPendingQuantity;
            updatedLine.oaRsvQty = metrics.oaRsvQty;
            updatedLine.oaPickedQty = metrics.oaPickedQty;
            updatedLine.binQty = metrics.binQty;
            updatedLine.binRsvQty = metrics.binRsvQty;
          }
          if (updatedLine.rrsError) {
            updatedLine.oaPendingQuantity = undefined;
            updatedLine.oaRsvQty = undefined;
            updatedLine.oaPickedQty = undefined;
            updatedLine.binQty = undefined;
            updatedLine.binRsvQty = undefined;
          }
        } catch (err) {
          console.error('Failed to retrieve item metrics:', err);
        }
      }
      return updatedLine;
    }));
    setLines(updated);
  };

  const handleSave = async () => {
    try {
      const headerValues = await form.validateFields();
      if (lines.length === 0) {
        message.error('At least one line item is required.');
        return;
      }
      for (const line of lines) {
        if (!line.organizationId || !line.inventoryItemId || line.b3Quantity <= 0 || !line.targetDate) {
          message.error('Please fill in all line item details and ensure quantity is positive.');
          return;
        }
        if (line.rrsError) {
          message.error(`Cannot save: Item ${line.itemCode} has a restricted RRS Category ("Rn"). Please clear the line or select a different item.`);
          return;
        }
      }
      setLoading(true);
      const requestPayload: any = {
        transactionDate: new Date().toISOString().split('T')[0],
        customerOrItemSpecific: 1,
        customerId: selectedBillToCustomer,
        territoryId: null,
        region: currentRegion?.region,
        billToCustomer: selectedBillToCustomer,
        shipToCustomer: selectedShipToCustomer,
        createdBy: currentUser?.username,
        remarks: headerValues.remarks,
        lines: lines.map(l => ({
          organizationId: l.organizationId,
          inventoryItemId: l.inventoryItemId!,
          b3Quantity: l.b3Quantity,
          targetDate: l.targetDate
        }))
      };
      const result = await createAllocation(requestPayload);
      addNotification(`Bin Allocation created successfully under Header ID: ${result.headerId}`, 'info');
      navigate('/');
    } catch (err) {
      console.error(err);
      message.error('Failed to create Bin Allocation. Check form errors.');
    } finally {
      setLoading(false);
    }
  };

  const validateCustomersMatch = (changedField: string, incomingValue: any) => {
    const otherField = changedField === 'billToCustomer' ? 'shipToCustomer' : 'billToCustomer';
    const otherValue = form.getFieldValue(otherField);
    if (incomingValue && otherValue && incomingValue !== otherValue) {
      Modal.confirm({
        title: 'Different Customers Selected',
        content: 'You have selected a different customer for Bill To and Ship To. Do you want to continue?',
        okText: 'Continue',
        cancelText: 'Change',
        onCancel: () => {
          form.setFieldsValue({ [changedField]: undefined });
          if (changedField === 'billToCustomer') setSelectedBillToCustomer(null);
          if (changedField === 'shipToCustomer') setSelectedShipToCustomer(null);
        },
      });
    }
  };

  return (
    <div className="fulfillment-container">
      <div className="fulfillment-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <Space direction="vertical" size={2}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={24} style={{ color: 'var(--primary-color)' }} />
              <Title level={2} style={{ margin: 0, color: 'var(--text-primary)' }}>Create B3 Input</Title>
            </div>
            <Text type="secondary">Define header details and add line item quantities below</Text>
          </Space>
          <Button
            size='small'
            danger
            onClick={handleClearAll}
            icon={<X size={16} />}
            style={{ borderRadius: 8, marginTop: 10 }}
          >
            Clear All
          </Button>
        </div>
      </div>

      <Collapse
        activeKey={activePanel}
        onChange={setActivePanel}
        expandIconPosition="end"
        style={{ marginBottom: 24, borderRadius: 12, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--shadow-sm)' }}
      >
        <Panel
          header={
            <Space>
              <FileText size={18} style={{ color: 'var(--primary-color)' }} />
              <span style={{ fontWeight: 600, fontSize: 16 }}>1. B3 Header</span>
            </Space>
          }
          key="header"
        >
          <Form form={form} layout="vertical" className="header-form">
            <Row gutter={[16, 12]}>
              <Col xs={24}>
                <Form.Item
                  name="optionType"
                  label="Option Type"
                  rules={[{ required: true, message: 'Option type is required' }]}
                  initialValue="Customer Specific"
                >
                  <Radio.Group
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'Item Specific') {
                        form.setFieldsValue({
                          operatingUnit: undefined,
                          billToCustomer: undefined,
                          billToLocation: undefined,
                          shipToCustomer: undefined,
                          shipToLocation: undefined,
                        });
                        setSelectedBillToCustomer(null);
                        setSelectedShipToCustomer(null);
                      }
                    }}
                  >
                    <Radio value="Customer Specific">Customer Specific</Radio>
                    <Radio value="Item Specific">Item Specific</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>

              <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.optionType !== currentValues.optionType} noStyle>
                {({ getFieldValue }) => {
                  const isItemSpecific = getFieldValue('optionType') === 'Item Specific';
                  if (isItemSpecific) return null;
                  return (
                    <>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item label="Region" required>
                          <Select
                            placeholder="Select region"
                            value={selectedRegion || undefined}
                            onChange={(val) => {
                              setSelectedRegion(val);
                              setSelectedSubRegion('');
                              setBillToCustomers([]);
                              setShipToCustomers([]);
                              form.setFieldsValue({ billToCustomer: null, shipToCustomer: null });
                            }}
                            showSearch
                            disabled
                          >
                            {uniqueRegions.map((reg, i) => (
                              <Select.Option key={i} value={reg}>
                                {reg}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>

                      <Col xs={24} sm={12} md={8}>
                        <Form.Item label="Sub-Region" required>
                          <Select
                            placeholder="Select sub-region"
                            value={selectedSubRegion || undefined}
                            disabled={!selectedRegion}
                            onChange={(val) => setSelectedSubRegion(val)}
                            showSearch
                          >
                            {subRegions.map((sub, i) => (
                              <Select.Option key={i} value={sub}>
                                {sub}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>

                      <Col xs={24} sm={12} md={8}>
                        <Form.Item
                          name="operatingUnit"
                          label="Operating Unit"
                          rules={[{ required: true, message: 'Operating unit is required' }]}
                        >
                          <Select
                            placeholder="Select operating unit"
                            onChange={(val) => setSelectedOU(val)}
                          >
                            {operatingUnits.map(ou => (
                              <Select.Option key={ou.organizationId} value={ou.organizationId}>
                                {ou.name}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>

                      <Col xs={24} sm={12} md={12}>
                        <Card size="small" className="address-card" title={
                          <Space><MapPin size={16} color="var(--primary-color)" /><span>Bill To Destination</span></Space>
                        }>
                          <Form.Item
                            name="billToCustomer"
                            label="Bill To Customer"
                            rules={[{ required: true, message: 'Bill to customer is required' }]}
                          >
                            <Select
                              placeholder="Select bill-to customer"
                              disabled={!selectedSubRegion}
                              onChange={(val) => {
                                setSelectedBillToCustomer(val);
                                form.setFieldsValue({ shipToCustomer: val });
                                const customer = billToCustomers.find(c => c.customerId === val)
                                setShipToCustomers(customer ? [customer] : []);
                                setSelectedShipToCustomer(val);
                                validateCustomersMatch('billToCustomer', val);
                              }}
                              showSearch
                              optionFilterProp="children"
                            >
                              {billToCustomers.map(c => (
                                <Select.Option key={c.customerId} value={c.customerId}>
                                  {c.customerName}
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>

                          <Form.Item
                            name="billToLocation"
                            label="Bill To Address Location"
                            rules={[{ required: true, message: 'Address location is required' }]}
                          >
                            <Select
                              placeholder="Select address location"
                              disabled={!selectedBillToCustomer || !selectedOU}
                              onChange={handleBillToLocationSelect}
                            >
                              {billToAddresses.map((addr, i) => (
                                <Select.Option key={i} value={addr.location}>
                                  {addr.location}
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                          {billToAddressDetail && (
                            <div className="address-detail-text">
                              <Text type="secondary" style={{ fontSize: '12px' }}>{billToAddressDetail}</Text>
                            </div>
                          )}
                        </Card>
                      </Col>

                      <Col xs={24} sm={12} md={12}>
                        <Card size="small" className="address-card" title={
                          <Space><MapPin size={16} color="var(--secondary-color)" /><span>Ship To Destination</span></Space>
                        }>
                          <Form.Item
                            name="shipToCustomer"
                            label="Ship To Customer"
                            rules={[{ required: true, message: 'Ship to customer is required' }]}
                          >
                            <Select
                              placeholder="Select ship-to customer"
                              disabled={!selectedSubRegion}
                              loading={loadingShipToCustomers}
                              // 2. Safely extract the array data from your API response
                              onDropdownVisibleChange={async (open) => {
                                if (open && (!shipToCustomers || shipToCustomers.length === 0)) {
                                  setLoadingShipToCustomers(true);
                                  try {
                                    const response: any = await loadShipToCustomers();

                                    // If your API wraps the array in an object like response.data or response.customers
                                    const actualArray = response?.data || response || [];

                                    setShipToCustomers(Array.isArray(actualArray) ? actualArray : []);
                                  } catch (error) {
                                    console.error("Failed to load ship-to customers:", error);
                                    setShipToCustomers([]); // Fallback to empty array on error
                                  } finally {
                                    setLoadingShipToCustomers(false);
                                  }
                                }
                              }}
                              onChange={(val) => {
                                setSelectedShipToCustomer(val);
                                form.setFieldsValue({ shipToLocation: undefined });
                                validateCustomersMatch('shipToCustomer', val);
                              }}
                              showSearch
                              optionFilterProp="children"
                            >
                              {shipToCustomers.map(c => (
                                <Select.Option key={c.customerId} value={c.customerId}>
                                  {c.customerName}
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>

                          <Form.Item
                            name="shipToLocation"
                            label="Ship To Address Location"
                            rules={[{ required: true, message: 'Address location is required' }]}
                          >
                            <Select
                              placeholder="Select address location"
                              disabled={!selectedShipToCustomer || !selectedOU}
                              onChange={handleShipToLocationSelect}
                            >
                              {shipToAddresses.map((addr, i) => (
                                <Select.Option key={i} value={addr.location}>
                                  {addr.location}
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                          {shipToAddressDetail && (
                            <div className="address-detail-text">
                              <Text type="secondary" style={{ fontSize: '12px' }}>{shipToAddressDetail}</Text>
                            </div>
                          )}
                        </Card>
                      </Col>

                    </>
                  );
                }}
              </Form.Item>

              <Col xs={24}>
                <Form.Item
                  shouldUpdate={(prevValues, currentValues) => prevValues.optionType !== currentValues.optionType}
                  noStyle
                >
                  {({ getFieldValue }) => {
                    const isItemSpecific = getFieldValue('optionType') === 'Item Specific';
                    return (
                      <Form.Item
                        name="remarks"
                        label="Transaction Remarks"
                        rules={[{ required: isItemSpecific, message: 'Remarks are required for Item Specific transactions' }]}
                      >
                        <Input.TextArea rows={2} placeholder={isItemSpecific ? "Add required remarks..." : "Add optional remarks..."} />
                      </Form.Item>
                    );
                  }}
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Panel>
      </Collapse>

      <Card
        className="lines-card"
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Database size={18} style={{ color: 'var(--primary-color)' }} />
              <span style={{ fontWeight: 600 }}>2. B3 Line Items</span>
            </Space>
          </div>
        }
        style={{ borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', width: '100%' }}
      >
        {lines.map((line, idx) => (
          <div key={line.id} className="line-item-row-container" style={{ width: '100%' }}>
            {idx > 0 && <Divider style={{ margin: '16px 0' }} />}

            {/* Added style width 100% */}
            <Row gutter={[16, 12]} align="bottom" style={{ width: '100%', margin: 0 }}>
              {/* Changed md from 4 to 5 */}
              <Col xs={24} sm={12} md={5}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="field-label-custom">ORG</span>
                  <Select
                    placeholder="Select Org"
                    value={line.organizationId}
                    onChange={(val) => updateLineRow(line.id, 'organizationId', val)}
                    style={{ width: '100%' }}
                  >
                    {organizations.map(org => (
                      <Select.Option key={org.organizationId} value={org.organizationId}>
                        {org.organizationCode}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
              </Col>

              {/* Kept md at 5 */}
              <Col xs={24} sm={12} md={5}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="field-label-custom">Product</span>
                  <Select
                    placeholder="Select Item"
                    value={line.inventoryItemId}
                    onChange={(val) => updateLineRow(line.id, 'inventoryItemId', val)}
                    style={{ width: '100%' }}
                    showSearch
                    optionFilterProp="children"
                    onSearch={(value) => setSearchTerm(value)}
                  >
                    {items.map(item => (
                      <Select.Option key={item.inventoryItemId} value={item.inventoryItemId}>
                        {item.itemCode}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
              </Col>

              {/* Kept md at 5 */}
              <Col xs={24} sm={12} md={5}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span>Item Description</span>
                  <Input
                    value={line.description}
                    disabled
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      width: '100%',
                      color: '#000000',           /* Forces pure black text color */
                      WebkitTextFillColor: '#000000', /* Fixes browser override on Safari/Chrome */
                      opacity: 1,                 /* Prevents opacity fading from disabled state */
                      cursor: 'not-allowed'       /* Retains the disabled interactive feel */
                    }}
                  />
                </div>
              </Col>

              {/* Changed md from 3 to 4 */}
              <Col xs={24} sm={12} md={4}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="field-label-custom">Requested Qty</span>
                  <Input
                    type="number"
                    min={1}
                    value={line.b3Quantity === 0 ? '' : line.b3Quantity}
                    onChange={(e) => updateLineRow(line.id, 'b3Quantity', parseInt(e.target.value) || 0)}
                    style={{ width: '100%' }}
                  />
                </div>
              </Col>

              {/* Changed md from 3 to 4 */}
              <Col xs={24} sm={12} md={4}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="field-label-custom">Target Date</span>
                  <DatePicker
                    placeholder="Date"
                    style={{ width: '100%' }}
                    onChange={(_, dateString) => updateLineRow(line.id, 'targetDate', Array.isArray(dateString) ? dateString[0] : dateString)}
                  />
                </div>
              </Col>

              {/* Changed md from 1 to 1 remaining to fulfill 24 total grid count */}
              <Col xs={24} sm={12} md={1} style={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  danger
                  type="text"
                  icon={<Trash2 size={18} />}
                  onClick={() => removeLineRow(line.id)}
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 40, width: '100%' }}
                />
              </Col>
            </Row>

            <div style={{ marginTop: 12 }}>
              {line.rrsError && (
                <Alert
                  type="error"
                  showIcon
                  message={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Validation Error: Item <strong>{line.itemCode}</strong> returned restricted Sales Category "Rn" for organization. This item cannot be used.</span>
                      <Button
                        type="primary"
                        danger
                        size="small"
                        onClick={() => clearLine(line.id)}
                        style={{ marginLeft: 16, whiteSpace: 'nowrap' }}
                      >
                        Clear Line
                      </Button>
                    </div>
                  }
                  style={{ marginBottom: 8, borderRadius: 6 }}
                />
              )}

              {line.oaPendingQuantity !== undefined && !line.rrsError && (
                <div className="metrics-container" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  <Tag color="blue" style={{ borderRadius: 4, padding: '4px 8px' }}>
                    <strong>OA Pending Qty:</strong> {line.oaPendingQuantity}
                  </Tag>
                  <Tag color="warning" style={{ borderRadius: 4, padding: '4px 8px' }}>
                    <strong>OA Reserved Qty:</strong> {line.oaRsvQty}
                  </Tag>
                  <Tag color="success" style={{ borderRadius: 4, padding: '4px 8px' }}>
                    <strong>OA Picked Qty:</strong> {line.oaPickedQty}
                  </Tag>
                  <Tag color="purple" style={{ borderRadius: 4, padding: '4px 8px' }}>
                    <strong>Bin Qty:</strong> {line.binQty}
                  </Tag>
                  <Tag color="cyan" style={{ borderRadius: 4, padding: '4px 8px' }}>
                    <strong>Bin Reserved Qty:</strong> {line.binRsvQty}
                  </Tag>
                </div>
              )}
            </div>
          </div>
        ))}
      </Card>

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <Button type="primary" size='small' onClick={addLineRow} icon={<Plus size={16} />}>
          Add Line Row
        </Button>
        <Button size='small' onClick={() => navigate('/')} style={{ borderRadius: 8 }}>
          Cancel
        </Button>
        <Button
          type="primary"
          onClick={handleSave}
          icon={<Save size={16} />}
          loading={loading}
          style={{ borderRadius: 8 }}
          size='small'
        >
          Save
        </Button>
      </div>
    </div>
  );
};