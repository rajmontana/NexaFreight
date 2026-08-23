import os
import requests
from typing import Optional, Tuple, Any, Dict

# Fallback Corporate Proxy configuration
CORPORATE_PROXY = {
    "http": "http://edcguest:edcguest@172.31.100.27:3128",
    "https": "http://edcguest:edcguest@172.31.100.27:3128"
}

def smart_request(
    url: str,
    method: str = "GET",
    headers: Optional[Dict[str, str]] = None,
    json_data: Optional[Any] = None,
    params: Optional[Dict[str, Any]] = None,
    timeout: int = 5
) -> Tuple[Optional[requests.Response], str]:
    """
    Adaptive Networking:
    1. Try DIRECT normal internet connection first (Zero proxy).
    2. If direct connection fails (proxy required/timeout), automatically failover to corporate proxy.
    """
    # 1. ATTEMPT DIRECT NORMAL CONNECTION FIRST (NO PROXY)
    try:
        if method.upper() == "GET":
            resp = requests.get(url, headers=headers, params=params, timeout=timeout)
        elif method.upper() == "POST":
            resp = requests.post(url, headers=headers, json=json_data, params=params, timeout=timeout)
        else:
            resp = requests.request(method, url, headers=headers, json=json_data, params=params, timeout=timeout)
            
        if resp.status_code == 200:
            return resp, "direct"
    except Exception as direct_err:
        pass

    # 2. FAILOVER TO CORPORATE PROXY IF DIRECT NETWORK FAILS
    try:
        if method.upper() == "GET":
            resp = requests.get(url, headers=headers, params=params, proxies=CORPORATE_PROXY, timeout=timeout)
        elif method.upper() == "POST":
            resp = requests.post(url, headers=headers, json=json_data, params=params, proxies=CORPORATE_PROXY, timeout=timeout)
        else:
            resp = requests.request(method, url, headers=headers, json=json_data, params=params, proxies=CORPORATE_PROXY, timeout=timeout)
            
        if resp.status_code == 200:
            return resp, "proxy"
    except Exception as proxy_err:
        pass

    return None, "failed"
