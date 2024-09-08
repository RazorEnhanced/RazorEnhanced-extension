# Makefile for RazorEnhanced-extension

# Variables
PUBLISHER := razorenhanced
EXTENSION_NAME := razorenhanced
VERSION := 0.0.2
VSIX_FILE := $(EXTENSION_NAME)-$(VERSION).vsix

# Default target
all: npm-install package

# Install dependencies
npm-install:
	@echo "Installing dependencies..."
	npm install
	npm install ws protobufjs

lint:
	eslint ./extension.js

# Package the extension into a .vsix file
package: lint 
	@echo "Packaging the extension into a .vsix file..."
	vsce package 

# Clean the project
clean:
	@echo "Cleaning the project..."
	rm -rf node_modules
	rm -f $(VSIX_FILE)

# Install the extension in VS Code/VSCodium
install: package
	@echo "Installing the extension..."
	code --install-extension $(VSIX_FILE)

# Uninstall the extension
uninstall:
	@echo "Uninstalling the extension..."
	code --uninstall-extension $(PUBLISHER).$(EXTENSION_NAME)

# Open the project in VSCodium
open:
	@echo "Opening the project in VSCodium

protobuf:
	protoc -I ./proto --python_out=./test/ ProtoControl.proto

test: protobuf 
	python3 test/test.py
