# Brainwave Desktop App - Settings Storage

## 📁 API Key 存储位置

Desktop 版本的 API key 和其他设置存储在系统的用户数据目录中。

### 🗂️ 存储路径（按操作系统）

#### macOS
```
~/Library/Application Support/brainwave-realtime-transcription/
├── settings.json         # 主设置文件
└── settings.backup.json  # 自动备份文件
```

完整路径示例：
```
/Users/your-username/Library/Application Support/brainwave-realtime-transcription/settings.json
```

#### Windows
```
%APPDATA%\brainwave-realtime-transcription\
├── settings.json
└── settings.backup.json
```

完整路径示例：
```
C:\Users\your-username\AppData\Roaming\brainwave-realtime-transcription\settings.json
```

#### Linux
```
~/.config/brainwave-realtime-transcription/
├── settings.json
└── settings.backup.json
```

完整路径示例：
```
/home/your-username/.config/brainwave-realtime-transcription/settings.json
```

---

## 📄 文件格式

### settings.json 结构

```json
{
  "apiKeys": {
    "openai": "sk-proj-...",
    "gemini": "AIza..."
  },
  "version": "1.0.0",
  "createdAt": "2024-12-20T12:00:00.000Z"
}
```

### 字段说明

- **apiKeys**: 存储 API 密钥
  - `openai`: OpenAI API key (必需)
  - `gemini`: Google Gemini API key (可选)
- **version**: 设置文件版本
- **createdAt**: 设置文件创建时间

---

## 🔒 安全机制

### 1. 文件系统权限保护

- **用户专属目录**: 文件存储在当前用户的专属目录中
- **操作系统保护**: 利用操作系统的文件权限机制
- **访问限制**: 只有当前用户账户可以读写这些文件

### 2. 自动备份

- **备份文件**: 每次保存设置时自动创建备份
- **自动恢复**: 如果主文件损坏，自动从备份恢复
- **数据安全**: 防止意外数据丢失

### 3. 代码安全

- **不硬编码**: API key 不会出现在源代码中
- **不提交**: 设置文件不会被提交到 Git 仓库
- **不打包**: API key 不会被打包到应用程序中

---

## 🔍 查看设置位置

### 使用提供的脚本

```bash
# 运行检查脚本
./check-settings-location.sh
```

### 手动查看（macOS）

```bash
# 查看设置目录
ls -la ~/Library/Application\ Support/brainwave-realtime-transcription/

# 查看设置文件（API key 会显示）
cat ~/Library/Application\ Support/brainwave-realtime-transcription/settings.json

# 使用 jq 格式化查看
cat ~/Library/Application\ Support/brainwave-realtime-transcription/settings.json | jq .
```

### 手动查看（Windows）

```powershell
# 查看设置目录
dir %APPDATA%\brainwave-realtime-transcription\

# 查看设置文件
type %APPDATA%\brainwave-realtime-transcription\settings.json
```

### 手动查看（Linux）

```bash
# 查看设置目录
ls -la ~/.config/brainwave-realtime-transcription/

# 查看设置文件
cat ~/.config/brainwave-realtime-transcription/settings.json
```

---

## 🛠️ 管理设置

### 通过应用界面（推荐）

1. 启动 Brainwave 桌面应用
2. 点击菜单中的 **Settings** 或 **设置**
3. 在设置对话框中输入 API keys
4. 点击 **Save** 保存

### 手动编辑（高级用户）

1. 关闭 Brainwave 应用
2. 找到设置文件位置（见上文）
3. 用文本编辑器打开 `settings.json`
4. 编辑 API keys
5. 保存文件
6. 重新启动应用

**注意**: 手动编辑时请确保 JSON 格式正确！

---

## 🗑️ 重置设置

### 方法 1: 删除设置文件

```bash
# macOS/Linux
rm -rf ~/Library/Application\ Support/brainwave-realtime-transcription/

# Windows (PowerShell)
Remove-Item -Recurse -Force $env:APPDATA\brainwave-realtime-transcription\
```

### 方法 2: 通过应用（未来功能）

应用将来可能会提供"重置设置"功能。

---

## ❓ 常见问题

### Q: API key 是加密存储的吗？

A: 不是。API key 以明文形式存储在 JSON 文件中，但受到操作系统文件权限的保护。只有你的用户账户可以访问这个文件。

### Q: 如果我重装应用，设置会丢失吗？

A: 不会。设置存储在用户数据目录中，独立于应用程序。重装应用不会影响设置。

### Q: 我可以在多台电脑上使用同一个 API key 吗？

A: 可以。你需要在每台电脑上分别配置 API key。

### Q: 如何备份我的设置？

A: 复制整个设置目录到安全的地方：
```bash
# macOS
cp -r ~/Library/Application\ Support/brainwave-realtime-transcription/ ~/Desktop/brainwave-backup/
```

### Q: 如何迁移设置到新电脑？

A: 
1. 在旧电脑上备份设置目录
2. 在新电脑上安装 Brainwave
3. 将备份的设置目录复制到新电脑的对应位置
4. 启动应用

---

## 🔐 安全建议

1. **定期更换 API key**: 建议定期更换 API key 以提高安全性
2. **不要分享设置文件**: 设置文件包含你的 API key，不要分享给他人
3. **备份设置**: 定期备份设置文件，防止意外丢失
4. **监控 API 使用**: 在 OpenAI/Google 控制台监控 API 使用情况
5. **设置使用限制**: 在 API 提供商处设置使用限制和预算

---

## 📞 技术支持

如果你在设置存储方面遇到问题：

1. 检查文件权限
2. 确保目录存在
3. 验证 JSON 格式
4. 查看应用日志
5. 提交 GitHub Issue

---

*最后更新: 2024-12-20*
