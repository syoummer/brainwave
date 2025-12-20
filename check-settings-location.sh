#!/bin/bash

# Script to check Brainwave settings location

echo "🔍 Brainwave Settings Location Checker"
echo "======================================"
echo ""

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    SETTINGS_DIR="$HOME/Library/Application Support/brainwave-realtime-transcription"
    echo "📍 Operating System: macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    SETTINGS_DIR="$HOME/.config/brainwave-realtime-transcription"
    echo "📍 Operating System: Linux"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    SETTINGS_DIR="$APPDATA/brainwave-realtime-transcription"
    echo "📍 Operating System: Windows"
else
    echo "❌ Unknown operating system: $OSTYPE"
    exit 1
fi

echo "📁 Settings Directory: $SETTINGS_DIR"
echo ""

# Check if directory exists
if [ -d "$SETTINGS_DIR" ]; then
    echo "✅ Settings directory exists"
    echo ""
    
    # Check for settings file
    if [ -f "$SETTINGS_DIR/settings.json" ]; then
        echo "✅ Settings file found: settings.json"
        echo ""
        echo "📄 File contents (API keys hidden):"
        echo "-----------------------------------"
        
        # Display settings with API keys masked
        if command -v jq &> /dev/null; then
            cat "$SETTINGS_DIR/settings.json" | jq '.apiKeys |= (. | to_entries | map({(.key): (if .value then "***HIDDEN***" else null end)}) | add)'
        else
            echo "Note: Install 'jq' to see formatted output"
            cat "$SETTINGS_DIR/settings.json"
        fi
        echo ""
    else
        echo "⚠️  Settings file not found"
        echo "   The app hasn't been configured yet"
        echo ""
    fi
    
    # Check for backup file
    if [ -f "$SETTINGS_DIR/settings.backup.json" ]; then
        echo "✅ Backup file found: settings.backup.json"
    else
        echo "ℹ️  No backup file yet"
    fi
    
    echo ""
    echo "📊 Directory contents:"
    ls -lh "$SETTINGS_DIR"
else
    echo "⚠️  Settings directory not found"
    echo "   The Brainwave desktop app hasn't been run yet"
    echo ""
    echo "💡 To create settings:"
    echo "   1. Launch the Brainwave desktop app"
    echo "   2. Open Settings from the menu"
    echo "   3. Enter your API keys"
    echo "   4. Click Save"
fi

echo ""
echo "🔒 Security Note:"
echo "   API keys are stored in plain text in this file."
echo "   The file is protected by your OS user permissions."
echo "   Only your user account can access this file."
