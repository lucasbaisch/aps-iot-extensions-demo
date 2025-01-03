$(document).ready(function () {
    let table;

    // Configura os pickers de data com valores padrão
    const defaultStartDate = new Date(new Date().setHours(0, 0, 0, 0));
    const defaultEndDate = new Date(new Date().setHours(23, 59, 59, 999));
    //date format 30/01/2025 06:25:55
    flatpickr("#start-date", { enableTime: true, dateFormat: "Y-m-d H:i", defaultDate: defaultStartDate });
    flatpickr("#end-date", { enableTime: true, dateFormat: "Y-m-d H:i", defaultDate: defaultEndDate });

    // Buscar dados do back-end
    $('#fetch-data').on('click', async () => {
        const start = $('#start-date').val();
        const end = $('#end-date').val();

        if (!start || !end) {
            alert('Por favor, preencha as datas de início e fim.');
            return;
        }

        try {
            const response = await fetch('/api/sensors/all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ start, end })
            });

            const data = await response.json();

            if (data.length === 0) {
                alert('Nenhum dado encontrado.');
                if (table) {
                    table.clear().draw(); // Limpa a tabela existente
                }
                return;
            }

            // Configurar colunas dinamicamente com base nos dados retornados
            const columns = Object.keys(data[0]).map(key => ({
                title: key.charAt(0).toUpperCase() + key.slice(1) // Capitaliza os títulos
            }));

            // Destruir tabela existente antes de recriar com novas colunas
            if (table) {
                table.destroy();
                $('#data-table').empty(); // Limpa o HTML da tabela
            }

            // Inicializa o DataTable com as colunas dinâmicas
            table = $('#data-table').DataTable({
                columns: columns
            });

            // Adiciona os dados à tabela
            data.forEach(row => {
                table.row.add(Object.values(row).map((value, index) => {
                    return index === 0 ? formatDateToBR(value) : value; // Formata a primeira coluna como data
                }));
            });

            table.draw();
        } catch (err) {
            console.error('Erro ao buscar dados:', err);
        }
    });

    // Exibir modal para escolha de download
    $('#download-excel').on('click', () => {
        $('#download-modal').css('display', 'flex');
    });

    // Fechar modal
    $('#close-modal').on('click', () => {
        $('#download-modal').css('display', 'none');
    });

    // Baixar os dados exibidos na tabela
    $('#download-visible').on('click', () => {
        const workbook = XLSX.utils.table_to_book($('#data-table')[0], { sheet: "Dados Visíveis" });
        XLSX.writeFile(workbook, 'dados_visiveis.xlsx');
        $('#download-modal').css('display', 'none');
    });

    // Baixar todos os dados do banco
    $('#download-all').on('click', async () => {
        const start = $('#start-date').val();
        const end = $('#end-date').val();

        if (!start || !end) {
            alert('Por favor, preencha as datas de início e fim.');
            $('#download-modal').css('display', 'none');
            return;
        }

        try {
            const response = await fetch('/api/sensors/all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ start, end })
            });

            const data = await response.json();

            if (data.length === 0) {
                alert('Nenhum dado encontrado.');
                $('#download-modal').css('display', 'none');
                return;
            }

            // Converter as datas para o formato brasileiro
            const formattedData = data.map(row => ({
                ...row,
                time: formatDateToBR(row.time)
            }));

            // Criar uma planilha com todos os dados formatados
            const worksheet = XLSX.utils.json_to_sheet(formattedData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Todos os Dados");
            XLSX.writeFile(workbook, 'dados_todos.xlsx');

            $('#download-modal').css('display', 'none');
        } catch (err) {
            console.error('Erro ao baixar todos os dados:', err);
        }
    });

    // Função para formatar datas no formato BR
    function formatDateToBR(dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    }
});
