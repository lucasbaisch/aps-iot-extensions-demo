#!/bin/bash

# Executar o script Python para preencher o banco de dados
python3 fill_db_fake_data.py

# Após completar, iniciar o servidor Node.js
node server.js
