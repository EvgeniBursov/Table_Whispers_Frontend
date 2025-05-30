import React, { useState, useEffect } from 'react';
import './ManagementDashboardCSS/MngAnalytics.css';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell, ScatterChart, Scatter,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ComposedChart, Area
} from 'recharts';
import { format, subMonths } from 'date-fns';
const API_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:5000';


const ManagementAnalytics = ({ restaurantId }) => {
  console.log("START ManagementAnalytics");
  
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: format(subMonths(new Date(), 6), 'yyyy-MM-dd'), // Default to last 6 months
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  // Modern color palette
  const COLORS = ['#3f51b5', '#00bcd4', '#ff9800', '#e91e63', '#9c27b0', '#4caf50', '#f44336', '#009688', '#cddc39', '#795548'];
  
  // Days of week for better labeling
  const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, pagination.page, pagination.limit]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/get_all_bills_for_Restaurants/restaurant/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
          analytics: true,
          page: pagination.page,
          limit: pagination.limit
        }),
      });

      const data = await response.json();
      console.log("Analytics data:", data);

      if (data && data.success) {
        setAnalyticsData(data);
        if (data.pagination) {
          setPagination(prev => ({
            ...prev,
            total: data.pagination.total,
            pages: data.pagination.pages
          }));
        }
      } else {
        setError(data?.message || 'Failed to load analytics data');
      }
    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const setLastMonths = (months) => {
    setDateRange({
      startDate: format(subMonths(new Date(), months), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd')
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({
        ...prev,
        page: newPage
      }));
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format time duration in minutes to a readable format
  const formatDuration = (minutes) => {
    if (!minutes) return "N/A";
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} minutes`;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy');
  };

  // Format customer name
  const formatCustomerName = (name) => {
    if (!name || name === "UNKNOWNUSER") return "Guest";
    return name;
  };

  // Prepare data for charts
  const prepareSalesByDayChart = () => {
    if (!analyticsData?.analytics?.salesByDay) return [];

    return Object.entries(analyticsData.analytics.salesByDay)
      .map(([date, data]) => ({
        date: formatDate(date),
        revenue: data.revenue,
        count: data.count
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const prepareSalesByMonthChart = () => {
    if (!analyticsData?.analytics?.salesByMonth) return [];

    return Object.entries(analyticsData.analytics.salesByMonth)
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        count: data.count
      }))
      .sort((a, b) => {
        // Extract year and month for proper chronological sorting
        const monthA = a.month.split(' ');
        const monthB = b.month.split(' ');
        const yearA = parseInt(monthA[1]);
        const yearB = parseInt(monthB[1]);
        if (yearA !== yearB) return yearA - yearB;
        
        const months = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"];
        return months.indexOf(monthA[0]) - months.indexOf(monthB[0]);
      });
  };

  const prepareSalesByDayOfWeekChart = () => {
    if (!analyticsData?.analytics?.salesByDayOfWeek) return [];

    // Ensure all days of week are represented and in correct order
    return DAYS_OF_WEEK.map(day => {
      const dayData = analyticsData.analytics.salesByDayOfWeek[day] || { count: 0, revenue: 0 };
      return {
        day,
        revenue: dayData.revenue,
        count: dayData.count
      };
    });
  };

  const prepareTopSellingItemsChart = () => {
    if (!analyticsData?.analytics?.topSellingItems) return [];

    return Object.entries(analyticsData.analytics.topSellingItems)
      .map(([name, data]) => ({
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        fullName: name,
        count: data.count,
        revenue: data.revenue,
        averagePrice: data.averagePrice
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 items
  };

  const prepareItemsByCategory = () => {
    if (!analyticsData?.analytics?.itemsByCategory) return [];

    return Object.entries(analyticsData.analytics.itemsByCategory)
      .map(([category, data]) => ({
        category,
        count: data.count,
        revenue: data.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue);
  };

  const preparePeakHoursChart = () => {
    if (!analyticsData?.analytics?.peakHours) return [];

    return Object.entries(analyticsData.analytics.peakHours)
      .map(([hour, data]) => ({
        hour,
        count: data.count,
        revenue: data.revenue
      }))
      .sort((a, b) => {
        const hourA = parseInt(a.hour.split(':')[0]);
        const hourB = parseInt(b.hour.split(':')[0]);
        return hourA - hourB;
      });
  };

  const prepareTableUsageChart = () => {
    if (!analyticsData?.analytics?.tableUsage) return [];

    return Object.entries(analyticsData.analytics.tableUsage)
      .map(([table, data]) => ({
        table,
        usageCount: data.usageCount,
        totalRevenue: data.totalRevenue,
        averageRevenue: data.averageRevenue,
        averageGuests: data.averageGuests || 0
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  const preparePopularCombinationsChart = () => {
    if (!analyticsData?.analytics?.popularItemCombinations) return [];

    return Object.entries(analyticsData.analytics.popularItemCombinations)
      .map(([combination, data]) => ({
        combination,
        count: data.count,
        items: data.items
      }))
      .sort((a, b) => b.count - a.count);
  };

  const prepareCustomerDataChart = () => {
    if (!analyticsData?.analytics?.customerData) return [];

    return Object.entries(analyticsData.analytics.customerData)
      .map(([id, data]) => ({
        id,
        name: formatCustomerName(data.name),
        visitCount: data.visitCount,
        totalSpent: data.totalSpent,
        averageSpend: data.averageSpend,
        lastVisit: data.lastVisit
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10); // Top 10 customers
  };

  const prepareOrderStatusChart = () => {
    if (!analyticsData?.analytics?.orderStatusDistribution) return [];

    const statusTranslation = {
      'Planning': 'Planning',
      'Done': 'Completed',
      'Cancelled': 'Cancelled',
      'Seated': 'Seated'
    };

    return Object.entries(analyticsData.analytics.orderStatusDistribution)
      .map(([status, count]) => ({
        status: statusTranslation[status] || status,
        count
      }))
      .filter(item => item.count > 0);
  };

  if (loading && !analyticsData) {
    return (
      <div className="mng-loading">
        <div className="mng-loading-spinner"></div>
        <div className="mng-loading-text">Loading analytics data...</div>
      </div>
    );
  }

  if (error && !analyticsData) {
    return (
      <div className="mng-error-state">
        <div className="mng-error-icon">❌</div>
        <h2>Error Loading Analytics</h2>
        <p>{error}</p>
        <button onClick={fetchAnalyticsData}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="mng-analytics-container">
      <div className="mng-analytics-header">
        <h1>Restaurant Analytics</h1>
        <div className="mng-date-filters">
          <div className="mng-quick-date-filters">
            <button onClick={() => setLastMonths(1)} className="mng-date-filter-btn">Last Month</button>
            <button onClick={() => setLastMonths(3)} className="mng-date-filter-btn">3 Months</button>
            <button onClick={() => setLastMonths(6)} className="mng-date-filter-btn">6 Months</button>
            <button onClick={() => setLastMonths(12)} className="mng-date-filter-btn">Year</button>
          </div>
          <div className="mng-date-input-group">
            <label>From:</label>
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
            />
          </div>
          <div className="mng-date-input-group">
            <label>To:</label>
            <input
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
            />
          </div>
          <button className="mng-refresh-btn" onClick={fetchAnalyticsData}>
            Refresh Data
          </button>
        </div>
      </div>

      {analyticsData && analyticsData.analytics && (
        <div className="mng-analytics-content">
          {/* Tabs Navigation */}
          <div className="mng-analytics-tabs">
            <button 
              className={`mng-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`mng-tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
              onClick={() => setActiveTab('sales')}
            >
              Sales
            </button>
            <button 
              className={`mng-tab-btn ${activeTab === 'items' ? 'active' : ''}`}
              onClick={() => setActiveTab('items')}
            >
              Menu Items
            </button>
            <button 
              className={`mng-tab-btn ${activeTab === 'tables' ? 'active' : ''}`}
              onClick={() => setActiveTab('tables')}
            >
              Tables
            </button>
            <button 
              className={`mng-tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
              onClick={() => setActiveTab('customers')}
            >
              Customers
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="mng-analytics-tab-content">
              <div className="mng-stats-cards">
                <div className="mng-stat-card">
                  <div className="mng-stat-icon" style={{ backgroundColor: '#e3f2fd' }}>💰</div>
                  <div className="mng-stat-content">
                    <h3>Total Revenue</h3>
                    <div className="mng-stat-value">{formatCurrency(analyticsData.analytics.totalRevenue)}</div>
                  </div>
                </div>
                <div className="mng-stat-card">
                  <div className="mng-stat-icon" style={{ backgroundColor: '#e8f5e9' }}>🧾</div>
                  <div className="mng-stat-content">
                    <h3>Average Bill</h3>
                    <div className="mng-stat-value">{formatCurrency(analyticsData.analytics.averageBillAmount)}</div>
                  </div>
                </div>
                <div className="mng-stat-card">
                  <div className="mng-stat-icon" style={{ backgroundColor: '#fff8e1' }}>📊</div>
                  <div className="mng-stat-content">
                    <h3>Total Bills</h3>
                    <div className="mng-stat-value">{analyticsData.count}</div>
                  </div>
                </div>
                <div className="mng-stat-card">
                  <div className="mng-stat-icon" style={{ backgroundColor: '#f3e5f5' }}>👥</div>
                  <div className="mng-stat-content">
                    <h3>Total Guests</h3>
                    <div className="mng-stat-value">{analyticsData.analytics.totalGuests || 0}</div>
                    <div className="mng-stat-subvalue">Avg: {(analyticsData.analytics.averageGuestsPerBill || 0).toFixed(1)} per bill</div>
                  </div>
                </div>

                {analyticsData.analytics.avgTimeSpent > 0 && (
                  <div className="mng-stat-card">
                    <div className="mng-stat-icon" style={{ backgroundColor: '#e1f5fe' }}>⏱️</div>
                    <div className="mng-stat-content">
                      <h3>Average Visit Duration</h3>
                      <div className="mng-stat-value">{formatDuration(analyticsData.analytics.avgTimeSpent)}</div>
                    </div>
                  </div>
                )}

                {analyticsData.analytics.bestSalesDay && (
                  <div className="mng-stat-card">
                    <div className="mng-stat-icon" style={{ backgroundColor: '#ffebee' }}>📆</div>
                    <div className="mng-stat-content">
                      <h3>Best Sales Day</h3>
                      <div className="mng-stat-value">{formatDate(analyticsData.analytics.bestSalesDay.date)}</div>
                      <div className="mng-stat-subvalue">{formatCurrency(analyticsData.analytics.bestSalesDay.revenue)}</div>
                    </div>
                  </div>
                )}

                {analyticsData.analytics.bestDayOfWeek && (
                  <div className="mng-stat-card">
                    <div className="mng-stat-icon" style={{ backgroundColor: '#fce4ec' }}>📅</div>
                    <div className="mng-stat-content">
                      <h3>Best Day of Week</h3>
                      <div className="mng-stat-value">{analyticsData.analytics.bestDayOfWeek.day}</div>
                      <div className="mng-stat-subvalue">{formatCurrency(analyticsData.analytics.bestDayOfWeek.revenue)}</div>
                    </div>
                  </div>
                )}

                {analyticsData.analytics.busiestHour && (
                  <div className="mng-stat-card">
                    <div className="mng-stat-icon" style={{ backgroundColor: '#e8eaf6' }}>🕒</div>
                    <div className="mng-stat-content">
                      <h3>Peak Hour</h3>
                      <div className="mng-stat-value">{analyticsData.analytics.busiestHour.time}</div>
                      <div className="mng-stat-subvalue">{analyticsData.analytics.busiestHour.count} orders</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mng-analytics-charts">
                <div className="mng-chart-container mng-chart-sales">
                  <h3>Daily Revenue</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={prepareSalesByDayChart()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#3f51b5" activeDot={{ r: 8 }} name="Revenue" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="mng-chart-container mng-chart-items">
                  <h3>Top 5 Selling Items</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prepareTopSellingItemsChart().slice(0, 5)} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip 
                        formatter={(value, name) => [name === "count" ? value : formatCurrency(value), name === "count" ? "Quantity" : "Revenue"]}
                        labelFormatter={(label, data) => data[0]?.payload?.fullName || label}
                      />
                      <Legend />
                      <Bar dataKey="count" fill="#00bcd4" name="Quantity" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mng-chart-container mng-chart-full">
                  <h3>Revenue by Day of Week</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={prepareSalesByDayOfWeekChart()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis yAxisId="left" orientation="left" stroke="#3f51b5" />
                      <YAxis yAxisId="right" orientation="right" stroke="#4caf50" />
                      <Tooltip formatter={(value, name) => [name === "count" ? value : formatCurrency(value), name === "count" ? "Orders" : "Revenue"]} />
                      <Legend />
                      <Bar yAxisId="right" dataKey="count" fill="#4caf50" name="Orders" />
                      <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#3f51b5" name="Revenue" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="mng-chart-container mng-chart-full">
                  <h3>Order Status Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={prepareOrderStatusChart()}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="status"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {prepareOrderStatusChart().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => value} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Sales Tab */}
          {activeTab === 'sales' && (
            <div className="mng-analytics-tab-content">
              <h2>Sales Analysis</h2>
              
              <div className="mng-analytics-charts">
                <div className="mng-chart-container mng-chart-full">
                  <h3>Daily Sales Revenue</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={prepareSalesByDayChart()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" orientation="left" stroke="#3f51b5" />
                      <YAxis yAxisId="right" orientation="right" stroke="#4caf50" />
                      <Tooltip formatter={(value, name) => [name === "count" ? value : formatCurrency(value), name === "count" ? "Orders" : "Revenue"]} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#3f51b5" activeDot={{ r: 8 }} name="Revenue" />
                      <Line yAxisId="right" type="monotone" dataKey="count" stroke="#4caf50" name="Orders" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="mng-chart-container mng-chart-full">
                  <h3>Monthly Sales Revenue</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={prepareSalesByMonthChart()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" orientation="left" stroke="#3f51b5" />
                      <YAxis yAxisId="right" orientation="right" stroke="#4caf50" />
                      <Tooltip formatter={(value, name) => [name === "count" ? value : formatCurrency(value), name === "count" ? "Orders" : "Revenue"]} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="revenue" fill="#3f51b5" name="Revenue" />
                      <Bar yAxisId="right" dataKey="count" fill="#4caf50" name="Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mng-chart-container mng-chart-half">
                  <h3>Revenue by Day of Week</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={prepareSalesByDayOfWeekChart()}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="day" />
                      <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                      <Radar name="Revenue" dataKey="revenue" stroke="#3f51b5" fill="#3f51b5" fillOpacity={0.6} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mng-chart-container mng-chart-half">
                  <h3>Peak Hours</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={preparePeakHoursChart()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#00bcd4" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mng-table-container">
                  <h3>Sales Summary</h3>
                  <table className="mng-analytics-table">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Total Revenue</td>
                        <td>{formatCurrency(analyticsData.analytics.totalRevenue)}</td>
                      </tr>
                      <tr>
                        <td>Average Bill Amount</td>
                        <td>{formatCurrency(analyticsData.analytics.averageBillAmount)}</td>
                      </tr>
                      <tr>
                        <td>Total Number of Bills</td>
                        <td>{analyticsData.count}</td>
                      </tr>
                      <tr>
                        <td>Best Sales Day</td>
                        <td>
                          {analyticsData.analytics.bestSalesDay 
                            ? `${formatDate(analyticsData.analytics.bestSalesDay.date)} (${formatCurrency(analyticsData.analytics.bestSalesDay.revenue)})`
                            : 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td>Best Day of Week</td>
                        <td>
                          {analyticsData.analytics.bestDayOfWeek 
                            ? `${analyticsData.analytics.bestDayOfWeek.day} (${formatCurrency(analyticsData.analytics.bestDayOfWeek.revenue)})`
                            : 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td>Busiest Hour</td>
                        <td>
                          {analyticsData.analytics.busiestHour 
                            ? `${analyticsData.analytics.busiestHour.time} (${analyticsData.analytics.busiestHour.count} orders)`
                            : 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td>Average Visit Duration</td>
                        <td>{formatDuration(analyticsData.analytics.avgTimeSpent)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Items Tab */}
          {activeTab === 'items' && (
            <div className="mng-analytics-tab-content">
              <h2>Menu Items Analysis</h2>
              
              <div className="mng-analytics-charts">
                <div className="mng-chart-container mng-chart-half">
                  <h3>Top 10 Selling Items by Quantity</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={prepareTopSellingItemsChart()} margin={{ top: 5, right: 30, left: 120, bottom: 5 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip 
                        formatter={(value) => value} 
                        labelFormatter={(label, data) => data[0]?.payload?.fullName || label}
                      />
                      <Legend />
                      <Bar dataKey="count" fill="#3f51b5" name="Quantity Sold" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mng-chart-container mng-chart-half">
                  <h3>Top 10 Items by Revenue</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart 
                      data={prepareTopSellingItemsChart().sort((a, b) => b.revenue - a.revenue)} 
                      margin={{ top: 5, right: 30, left: 120, bottom: 5 }} 
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)} 
                        labelFormatter={(label, data) => data[0]?.payload?.fullName || label}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="#4caf50" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mng-chart-container mng-chart-full">
                  <h3>Sales by Item Category</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={prepareItemsByCategory()}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="revenue"
                        nameKey="category"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {prepareItemsByCategory().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mng-chart-container mng-chart-full">
                  <h3>Popular Item Combinations</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart 
                      data={preparePopularCombinationsChart()} 
                      margin={{ top: 5, right: 30, left: 120, bottom: 5 }} 
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="combination" />
                      <Tooltip formatter={(value) => value} />
                      <Legend />
                      <Bar dataKey="count" fill="#ff9800" name="Frequency" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mng-table-container">
                  <h3>All Items Performance</h3>
                  <table className="mng-analytics-table">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Quantity Sold</th>
                        <th>Total Revenue</th>
                        <th>Average Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(analyticsData.analytics.topSellingItems).map(([name, data]) => (
                        <tr key={name}>
                          <td>{name}</td>
                          <td>{data.count}</td>
                          <td>{formatCurrency(data.revenue)}</td>
                          <td>{formatCurrency(data.averagePrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tables Tab */}
          {activeTab === 'tables' && (
            <div className="mng-analytics-tab-content">
              <h2>Table Performance</h2>
              
              <div className="mng-analytics-charts">
                <div className="mng-chart-container mng-chart-half">
                  <h3>Table Usage Frequency</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={prepareTableUsageChart()}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="usageCount"
                        nameKey="table"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {prepareTableUsageChart().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => value} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mng-chart-container mng-chart-half">
                  <h3>Table Revenue</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={prepareTableUsageChart()}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="totalRevenue"
                        nameKey="table"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {prepareTableUsageChart().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mng-chart-container mng-chart-full">
                  <h3>Table Revenue vs Guest Count</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid />
                      <XAxis type="number" dataKey="averageGuests" name="Avg Guests" unit=" guests" />
                      <YAxis type="number" dataKey="averageRevenue" name="Avg Revenue" unit="$" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => {
                        if (name === "averageRevenue") return [formatCurrency(value), "Avg Revenue"];
                        if (name === "averageGuests") return [value.toFixed(1), "Avg Guests"];
                        return [value, name];
                      }} />
                      <Legend />
                      <Scatter 
                        name="Tables" 
                        data={prepareTableUsageChart()} 
                        fill="#e91e63" 
                        shape="circle"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="mng-table-container">
                  <h3>Table Performance Details</h3>
                  <table className="mng-analytics-table">
                    <thead>
                      <tr>
                        <th>Table Number</th>
                        <th>Usage Count</th>
                        <th>Total Revenue</th>
                        <th>Average Revenue</th>
                        <th>Average Guests</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prepareTableUsageChart().map((table) => (
                        <tr key={table.table}>
                          <td>{table.table}</td>
                          <td>{table.usageCount}</td>
                          <td>{formatCurrency(table.totalRevenue)}</td>
                          <td>{formatCurrency(table.averageRevenue)}</td>
                          <td>{table.averageGuests.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {analyticsData.analytics.mostProfitableTable && (
                  <div className="mng-stats-cards">
                    <div className="mng-stat-card">
                      <div className="mng-stat-icon" style={{ backgroundColor: '#fce4ec' }}>🏆</div>
                      <div className="mng-stat-content">
                        <h3>Most Profitable Table</h3>
                        <div className="mng-stat-value">Table {analyticsData.analytics.mostProfitableTable.table}</div>
                        <div className="mng-stat-subvalue">{formatCurrency(analyticsData.analytics.mostProfitableTable.totalRevenue)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Customers Tab */}
          {activeTab === 'customers' && (
            <div className="mng-analytics-tab-content">
              <h2>Customer Analysis</h2>
              
              <div className="mng-analytics-charts">
                <div className="mng-stats-cards">
                  {analyticsData.analytics.mostValuableCustomer && (
                    <div className="mng-stat-card">
                      <div className="mng-stat-icon" style={{ backgroundColor: '#e8f5e9' }}>💎</div>
                      <div className="mng-stat-content">
                        <h3>Most Valuable Customer</h3>
                        <div className="mng-stat-value">{formatCustomerName(analyticsData.analytics.mostValuableCustomer.name)}</div>
                        <div className="mng-stat-subvalue">Total spent: {formatCurrency(analyticsData.analytics.mostValuableCustomer.totalSpent)}</div>
                      </div>
                    </div>
                  )}
                  
                  {analyticsData.analytics.mostFrequentCustomer && (
                    <div className="mng-stat-card">
                      <div className="mng-stat-icon" style={{ backgroundColor: '#e3f2fd' }}>🔄</div>
                      <div className="mng-stat-content">
                        <h3>Most Frequent Customer</h3>
                        <div className="mng-stat-value">{formatCustomerName(analyticsData.analytics.mostFrequentCustomer.name)}</div>
                        <div className="mng-stat-subvalue">Visits: {analyticsData.analytics.mostFrequentCustomer.visitCount}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mng-chart-container mng-chart-full">
                  <h3>Top 10 Customers by Total Spent</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart 
                      data={prepareCustomerDataChart()} 
                      margin={{ top: 5, right: 30, left: 120, bottom: 5 }} 
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="totalSpent" fill="#9c27b0" name="Total Spent" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mng-chart-container mng-chart-full">
                  <h3>Customer Visit Frequency vs Average Spend</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid />
                      <XAxis type="number" dataKey="visitCount" name="Visit Count" />
                      <YAxis type="number" dataKey="averageSpend" name="Average Spend" unit="$" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => {
                        if (name === "averageSpend") return [formatCurrency(value), "Average Spend"];
                        return [value, name];
                      }} />
                      <Legend />
                      <Scatter 
                        name="Customers" 
                        data={prepareCustomerDataChart()} 
                        fill="#673ab7" 
                        shape="circle"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="mng-table-container">
                  <h3>Top Customer Details</h3>
                  <table className="mng-analytics-table">
                    <thead>
                      <tr>
                        <th>Customer Name</th>
                        <th>Visit Count</th>
                        <th>Total Spent</th>
                        <th>Average Spend</th>
                        <th>Last Visit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prepareCustomerDataChart().map((customer) => (
                        <tr key={customer.id}>
                          <td>{customer.name}</td>
                          <td>{customer.visitCount}</td>
                          <td>{formatCurrency(customer.totalSpent)}</td>
                          <td>{formatCurrency(customer.averageSpend)}</td>
                          <td>{customer.lastVisit ? formatDate(customer.lastVisit) : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pagination controls */}
      {analyticsData && analyticsData.pagination && analyticsData.pagination.pages > 1 && (
        <div className="mng-pagination">
          <button 
            className="mng-pagination-btn" 
            disabled={pagination.page === 1}
            onClick={() => handlePageChange(pagination.page - 1)}
          >
            Previous
          </button>
          <span className="mng-pagination-info">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button 
            className="mng-pagination-btn" 
            disabled={pagination.page === pagination.pages}
            onClick={() => handlePageChange(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ManagementAnalytics;