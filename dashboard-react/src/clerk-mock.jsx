import React from 'react';

// A dummy component to allow the dashboard to render without a valid Clerk key
// WARNING: This is for development only!
export const MockClerkProvider = ({ children }) => {
    return <div className="clerk-mock-provider">{children}</div>;
};

export const SignedIn = ({ children }) => <>{children}</>;
export const SignedOut = ({ children }) => null;
export const RedirectToSignIn = () => <div>Login Required (Mock Mode)</div>;

export const UserButton = () => (
    <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: '#eee',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontSize: '12px'
    }}>
        U
    </div>
);

export const useAuth = () => {
    return {
        getToken: async () => "mock_token_123",
        userId: "user_test_mock",
        isLoaded: true,
        isSignedIn: true
    };
};
