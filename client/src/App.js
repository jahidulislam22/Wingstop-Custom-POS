import React, { useState, useEffect } from 'react';
import './App.css';
import wingstopLogo from './wingstop logo.png';
import wingsBundle from './wings-bundle.avif';

function App() {
  // Order/Cart states (left column) - Independent
  const [orderEmail, setOrderEmail] = useState('');
  const [cart, setCart] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [checkingOut, setCheckingOut] = useState(false);
  const [addToCartMessage, setAddToCartMessage] = useState(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);
  
  // Redemption states (right column) - Independent
  const [redemptionEmail, setRedemptionEmail] = useState('');
  const [selectedReward, setSelectedReward] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [redemptionMessage, setRedemptionMessage] = useState(null);
  const [redemptionError, setRedemptionError] = useState(null);
  const [redemptionResult, setRedemptionResult] = useState(null);
  const [customerPoints, setCustomerPoints] = useState(null);
  const [loadingPoints, setLoadingPoints] = useState(false);

  // Product data
  const product = {
    id: 'large-10-pc-wing-combo',
    name: 'Large 10 pc Wing Combo',
    description: '10 Boneless or Classic (Bone-In) wings with up to 2 flavours, regular fries or veggie sticks, 1 dip and a 16oz drink',
    image: wingsBundle,
    price: 16.99
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/rewards`);
      const data = await response.json();
      
      if (data.success && data.rewards) {
        const pointRewards = data.rewards.data
          .filter(reward => reward.attributes.source === 'points' && reward.attributes.enabled)
          .map(reward => ({
            id: reward.id,
            name: reward.attributes.name,
            points: reward.attributes.points_amount,
            value: reward.attributes.reward_value,
            description: reward.attributes.pretty_display_rewards
          }));
        
        setRewards(pointRewards);
      }
    } catch (err) {
      console.error('Error fetching rewards:', err);
      setRedemptionError('Failed to load rewards. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerPoints = async (email) => {
    if (!email || !email.includes('@')) {
      setCustomerPoints(null);
      return;
    }

    try {
      setLoadingPoints(true);
      setRedemptionError(null);
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/points/${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (data.success && data.customer) {
        setCustomerPoints({
          points: data.customer.data?.attributes?.points_tally || 0,
          credits: data.customer.data?.attributes?.credits_tally || 0,
          firstName: data.customer.data?.attributes?.first_name || '',
          lastName: data.customer.data?.attributes?.last_name || '',
          vipTier: data.customer.data?.attributes?.vip_tier?.name || null
        });
      } else {
        setCustomerPoints(null);
        setRedemptionError('Customer not found or no points data available');
      }
    } catch (err) {
      console.error('Error fetching customer points:', err);
      setCustomerPoints(null);
      setRedemptionError('Failed to fetch customer points');
    } finally {
      setLoadingPoints(false);
    }
  };

  const resetForm = () => {
    setRedemptionEmail('');
    setSelectedReward(null);
    setRedemptionResult(null);
    setRedemptionMessage(null);
    setRedemptionError(null);
    setCustomerPoints(null);
  };

  const handleAddToCart = () => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity }]);
    }
    
    setAddToCartMessage('✓ Added to cart!');
    setQuantity(1);
    setTimeout(() => setAddToCartMessage(null), 2000);
  };

  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setCheckoutError('Cart is empty');
      return;
    }

    if (!orderEmail) {
      setCheckoutError('Please enter your email to earn points');
      return;
    }

    setCheckingOut(true);
    setCheckoutError(null);
    setCheckoutSuccess(null);

    const pointsEarned = getPointsEarned();

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart,
          customerEmail: orderEmail,
          pointsEarned: pointsEarned
        })
      });

      const data = await response.json();

      if (data.success) {
        setCheckoutSuccess(`✓ Checkout completed! You earned ${pointsEarned} points! Check your email for details.`);
        setCart([]);
        setOrderEmail('');
        // Auto-hide success message after 5 seconds
        setTimeout(() => setCheckoutSuccess(null), 5000);
      } else {
        setCheckoutError(data.error || 'Failed to checkout');
      }
    } catch (err) {
      setCheckoutError('Network error. Make sure the backend is running on port 5000.');
    } finally {
      setCheckingOut(false);
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getPointsEarned = () => {
    const totalQuantity = getTotalItems();
    return totalQuantity * 50; // 50 points per item
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!redemptionEmail || !selectedReward) {
      setRedemptionError('Please enter email and select a reward');
      return;
    }

    setSubmitting(true);
    setRedemptionError(null);
    setRedemptionMessage(null);
    setRedemptionResult(null);

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/redeem-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: redemptionEmail,
          rewardId: selectedReward.id,
          rewardName: selectedReward.name,
          points: selectedReward.points
        })
      });

      const data = await response.json();

      if (data.success) {
        const result = {
          rewardCode: data.redemption?.discountCode,
          rewardName: data.reward?.name,
          pointsRedeemed: data.redemption?.pointsRedeemed,
          pointsRemaining: data.customer?.pointsRemaining,
          customerEmail: data.customer?.email,
          customerName: `${data.customer?.firstName || ''} ${data.customer?.lastName || ''}`.trim(),
          vipTier: data.customer?.vipTier,
          rewardValue: data.reward?.value,
          appliedAt: data.redemption?.appliedAt,
          expiresAt: data.redemption?.expiresAt
        };
        setRedemptionResult(result);
        setRedemptionMessage('✓ Points redeemed successfully!');
      } else {
        setRedemptionError(data.error || 'Failed to redeem points');
      }
    } catch (err) {
      setRedemptionError('Network error. Make sure the backend is running on port 5000.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="App">
        <div className="pos-container">
          <div className="loading">Loading rewards...</div>
        </div>
      </div>
    );
  }

  if (redemptionResult) {
    return (
      <div className="App">
        <div className="pos-container">
          <div className="success-screen">
            <div className="success-icon">🎉</div>
            <h2>Redemption Successful!</h2>
            <p>Points have been redeemed from Rivo</p>

            <div className="reward-code-box">
              <div className="code-label">Discount Code</div>
              <div className="reward-code">{redemptionResult.rewardCode || 'N/A'}</div>
              <div className="code-hint">Use this code at checkout</div>
            </div>

            <div className="redemption-details">
              <div className="detail-row">
                <span>Reward:</span>
                <strong>{redemptionResult.rewardName}</strong>
              </div>
              {redemptionResult.rewardValue && (
                <div className="detail-row">
                  <span>Value:</span>
                  <strong>${redemptionResult.rewardValue} off</strong>
                </div>
              )}
              <div className="detail-row">
                <span>Points Redeemed:</span>
                <strong>{redemptionResult.pointsRedeemed}</strong>
              </div>
              <div className="detail-row">
                <span>Points Remaining:</span>
                <strong>{redemptionResult.pointsRemaining}</strong>
              </div>
              {redemptionResult.vipTier && (
                <div className="detail-row">
                  <span>VIP Tier:</span>
                  <strong>{redemptionResult.vipTier}</strong>
                </div>
              )}
              <div className="detail-row">
                <span>Customer:</span>
                <strong>{redemptionResult.customerName || redemptionResult.customerEmail}</strong>
              </div>
              <div className="detail-row">
                <span>Email:</span>
                <strong>{redemptionResult.customerEmail}</strong>
              </div>
            </div>

            <button className="reset-button" onClick={resetForm}>
              Redeem Another Reward
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-container">
          <div className="header-left">
            <img src={wingstopLogo} alt="Wingstop Logo" className="header-logo" />
            <div className="header-brand">
              <h1 className="brand-name">My Wingstop</h1>
              <p className="brand-tagline">Flavor You Crave, Rewards You Deserve</p>
            </div>
          </div>
          <div className="header-right">
            <div className="header-info">
              <div className="info-item">
                <span className="info-icon">🛒</span>
                <span className="info-text">Order Now</span>
              </div>
              <div className="info-item">
                <span className="info-icon">🎁</span>
                <span className="info-text">Earn Rewards</span>
              </div>
              <div className="info-item">
                <span className="info-icon">⚡</span>
                <span className="info-text">50 pts per item</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="two-column-layout">
        {/* Left Column - Product & Cart */}
        <div className="left-column">
          <div className="section-container">
            <h2 className="section-title">🍗 Order Food</h2>
            
            {/* Product Section */}
            <div className="product-section">
              <div className="product-card">
                <div className="product-image-container">
                  <img src={product.image} alt={product.name} className="product-image" />
                  <span className="product-badge">Most Popular!</span>
                </div>
                <div className="product-details">
                  <h3 className="product-title">{product.name}</h3>
                  <p className="product-description">{product.description}</p>
                  <div className="product-price">${product.price}</div>
                  
                  {addToCartMessage && (
                    <div className="success-message">
                      {addToCartMessage}
                    </div>
                  )}
                  
                  <div className="product-actions">
                    <div className="quantity-selector">
                      <button 
                        type="button" 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="quantity-btn"
                      >
                        -
                      </button>
                      <span className="quantity-display">{quantity}</span>
                      <button 
                        type="button" 
                        onClick={() => setQuantity(quantity + 1)}
                        className="quantity-btn"
                      >
                        +
                      </button>
                    </div>
                    <button 
                      type="button"
                      onClick={handleAddToCart}
                      className="add-to-cart-btn"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Shopping Cart */}
            {cart.length > 0 && (
              <div className="cart-section">
                <h2 className="cart-title">
                  🛒 Shopping Cart ({getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'})
                </h2>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div key={item.id} className="cart-item">
                      <img src={item.image} alt={item.name} className="cart-item-image" />
                      <div className="cart-item-details">
                        <div className="cart-item-name">{item.name}</div>
                        <div className="cart-item-quantity">Quantity: {item.quantity}</div>
                      </div>
                      <div className="cart-item-price">${(item.price * item.quantity).toFixed(2)}</div>
                      <button 
                        type="button"
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="remove-btn"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="cart-total">
                  <span className="cart-total-label">Total:</span>
                  <span className="cart-total-price">${getTotalPrice()}</span>
                </div>
                <div className="points-earned-display">
                  <span className="points-earned-icon">🎁</span>
                  <span className="points-earned-text">You'll earn <strong>{getPointsEarned()} points</strong> with this order!</span>
                </div>
                
                {/* Email Input for Checkout */}
                <div className="checkout-email-section">
                  <label className="form-label">Your Email (to earn points & receive confirmation)</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={orderEmail}
                    onChange={(e) => setOrderEmail(e.target.value)}
                    className="pos-input"
                    disabled={checkingOut}
                  />
                </div>

                {/* Checkout Success Message */}
                {checkoutSuccess && (
                  <div className="success-message">
                    {checkoutSuccess}
                  </div>
                )}

                {/* Checkout Error Message */}
                {checkoutError && (
                  <div className="error-message">
                    ❌ {checkoutError}
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={handleCheckout}
                  className="checkout-btn"
                  disabled={checkingOut}
                >
                  {checkingOut ? 'Processing...' : 'Checkout'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - POS Redemption */}
        <div className="right-column">
          <div className="section-container">
            <h2 className="section-title">🎁 Redeem Points</h2>
            
            <form onSubmit={handleSubmit} className="pos-form">
          <div className="form-section">
            <label className="form-label">Customer Email</label>
            <div className="email-input-group">
              <div className="email-input-wrapper">
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={redemptionEmail}
                  onChange={(e) => setRedemptionEmail(e.target.value)}
                  className="pos-input"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => fetchCustomerPoints(redemptionEmail)}
                className="check-points-btn"
                disabled={loadingPoints || !redemptionEmail}
              >
                {loadingPoints ? '...' : 'Check Points'}
              </button>
            </div>
            {customerPoints && (
              <div className="customer-points-card">
                <div className="customer-points-header">
                  <div className="customer-name">
                    {customerPoints.firstName && customerPoints.lastName 
                      ? `${customerPoints.firstName} ${customerPoints.lastName}` 
                      : 'Customer'}
                  </div>
                  {customerPoints.vipTier && (
                    <div>
                      <span className="vip-badge-icon">🎖 Tier: </span>
                      <span className="vip-badge">{customerPoints.vipTier}</span>
                    </div>
                  )}
                </div>
                <div className="points-display">
                  <div className="points-row">
                    <span className="points-label">Available Points</span>
                    <span className="points-value">{customerPoints.points}</span>
                  </div>
                  {customerPoints.credits > 0 && (
                    <div className="points-row">
                      <span className="points-label">Store Credits</span>
                      <span className="credits-value">${customerPoints.credits}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="form-section">
            <label className="form-label">Select Reward</label>
            {rewards.length === 0 ? (
              <p className="no-rewards">No rewards available</p>
            ) : (
              <div className="rewards-grid">
                {rewards.map((reward) => (
                  <button
                    key={reward.id}
                    type="button"
                    className={`reward-card ${selectedReward?.id === reward.id ? 'selected' : ''}`}
                    onClick={() => setSelectedReward(reward)}
                  >
                    <div className="reward-name">{reward.name}</div>
                    <div className="reward-points">{reward.points} Points</div>
                    <div className="reward-value">${reward.value} off</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {redemptionError && (
            <div className="error-message">
              ❌ {redemptionError}
            </div>
          )}

          {redemptionMessage && (
            <div className="success-message">
              {redemptionMessage}
            </div>
          )}

          <button
            type="submit"
            className="submit-button"
            disabled={submitting || !redemptionEmail || !selectedReward}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>

        {selectedReward && (
          <div className="pos-info">
            <div className="info-row">
              <span className="info-label">Selected Reward:</span>
              <span className="info-value">{selectedReward.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Points Required:</span>
              <span className="info-value">{selectedReward.points}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Reward ID:</span>
              <span className="info-value">{selectedReward.id}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Customer Email:</span>
              <span className="info-value">{redemptionEmail || 'Not entered'}</span>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
