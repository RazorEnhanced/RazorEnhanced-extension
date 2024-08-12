# Makefile for RazorEnhanced-extension

# Variables
EXTENSION_NAME := RazorEnhanced-extension
VERSION := 0.0.1
VSIX_FILE := $(EXTENSION_NAME)-$(VERSION).vsix

# Default target
all: install package

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm install

# Build the extension
build: install
	@echo "Building the extension..."
	npm run compile

# Package the extension into a .vsix file
package: build
	@echo "Packaging the extension into a .vsix file..."
	vsce package 

# Clean the project
clean:
	@echo "Cleaning the project..."
	rm -rf node_modules
	rm -f $(VSIX_FILE)

# Install the extension in VS Code/VSCodium
install-extension: package
	@echo "Installing the extension..."
	code --install-extension $(VSIX_FILE)

# Uninstall the extension
uninstall-extension:
	@echo "Uninstalling the extension..."
	code --uninstall-extension $(EXTENSION_NAME)

# Open the project in VSCodium
open:
	@echo "Opening the project in VSCodium

protobuf:
	protoc -I ./proto --python_out=./test/ open_file.proto

test: install-extension
	python3 test/test.py
