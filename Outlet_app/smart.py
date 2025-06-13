import tinytuya
import time
import json

# Connect to Device
# --- 設定ファイルから秘密情報を読み込む ---
with open('config.json', 'r') as f:
    config = json.load(f)

# config.jsonの値を使ってデバイスに接続
d = tinytuya.OutletDevice(
    dev_id=config['tinytuya_device']['dev_id'],
    address=config['tinytuya_device']['address'],
    local_key=config['tinytuya_device']['local_key'], 
    version=config['tinytuya_device']['version']
)
# -----------------------------------------
# Get Status
# data = d.status() 
# print('set_status() result %r' % data)


# ログファイルの設定
log_file = './status_log.json'

# 状態を記録する関数
def log_status():
    data = d.status()
    with open(log_file, 'a') as f:
        log_entry = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'status': data
        }
        f.write(json.dumps(log_entry) + '\n')
        print('set_status() result %r' % data)


# 定期的に状態を記録（例えば、60秒ごと）
interval = 2  # 60秒
while True:
    log_status()
    time.sleep(interval)