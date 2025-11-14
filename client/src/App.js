import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedReward, setSelectedReward] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [redemptionResult, setRedemptionResult] = useState(null);

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/rewards');
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
      setError('Failed to load rewards. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCustomerEmail('');
    setSelectedReward(null);
    setRedemptionResult(null);
    setMessage(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!customerEmail || !selectedReward) {
      setError('Please enter email and select a reward');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);
    setRedemptionResult(null);

    try {
      const response = await fetch('http://localhost:5000/redeem-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: customerEmail,
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
        setMessage('✓ Points redeemed successfully!');
      } else {
        setError(data.error || 'Failed to redeem points');
      }
    } catch (err) {
      setError('Network error. Make sure the backend is running on port 5000.');
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
      <div className="pos-container">
        <div className="pos-header">
          <h1>🛒 POS System</h1>
          <p className="subtitle">Rivo Points Redemption</p>
        </div>

        <form onSubmit={handleSubmit} className="pos-form">
          <div className="form-section">
            <label className="form-label">Customer Email</label>
            <input
              type="email"
              placeholder="customer@example.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="pos-input"
              required
            />
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

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          {message && (
            <div className="success-message">
              {message}
            </div>
          )}

          <button
            type="submit"
            className="submit-button"
            disabled={submitting || !customerEmail || !selectedReward}
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
              <span className="info-value">{customerEmail || 'Not entered'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
