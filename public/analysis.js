$(document).ready(function () {
    let table;

    // Configura os pickers de data com valores padrão
    const defaultStartDate = new Date(new Date().setHours(0, 0, 0, 0));
    const defaultEndDate = new Date(new Date().setHours(23, 59, 59, 999));
    //date format 30/01/2025 06:25:55
    flatpickr("#start-date", { enableTime: true, dateFormat: "Y-m-d H:i", defaultDate: defaultStartDate });
    flatpickr("#end-date", { enableTime: true, dateFormat: "Y-m-d H:i", defaultDate: defaultEndDate });

    // Inicializa o Flatpickr com o locale em português
    flatpickr.localize(flatpickr.l10ns.pt);
    
    // Obtém a data atual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const startPicker = flatpickr("#start-time", {
        enableTime: true,
        dateFormat: "d/m/Y H:i:S",
        time_24hr: true,
        defaultDate: startOfMonth,
        defaultHour: 0,
        defaultMinute: 0,
        defaultSeconds: 0
    });

    const endPicker = flatpickr("#end-time", {
        enableTime: true,
        dateFormat: "d/m/Y H:i:S",
        time_24hr: true,
        defaultDate: endOfMonth,
        defaultHour: 23,
        defaultMinute: 59,
        defaultSeconds: 59
    });

    // Adiciona evento para o select de período
    document.getElementById('time-range').addEventListener('change', function() {
        const now = new Date();
        let startDate, endDate;

        switch(this.value) {
            case 'last30min':
                startDate = new Date(now.getTime() - 30 * 60000);
                endDate = now;
                break;
            case 'last1hour':
                startDate = new Date(now.getTime() - 60 * 60000);
                endDate = now;
                break;
            case 'last6hours':
                startDate = new Date(now.getTime() - 6 * 60 * 60000);
                endDate = now;
                break;
            case 'last24hours':
                startDate = new Date(now.getTime() - 24 * 60 * 60000);
                endDate = now;
                break;
            case 'custom':
                // Não faz nada, deixa o usuário escolher manualmente
                return;
        }

        startPicker.setDate(startDate);
        endPicker.setDate(endDate);
    });

    // Função para converter data do formato brasileiro para o formato da API
    function convertDateToAPIFormat(dateStr) {
        const [datePart, timePart] = dateStr.split(' ');
        const [day, month, year] = datePart.split('/');
        // Retorna no formato YYYY-MM-DD HH:mm:ss
        return `${year}-${month}-${day} ${timePart}`;
    }

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

    // Inicializa a tabela vazia
    table = $('#data-table').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json'
        },
        order: [[0, 'desc']], // Ordena por data decrescente
        pageLength: 10,
        lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
        dom: '<"top"lf>rt<"bottom"ip>',
        columns: [
            { title: "Data/Hora" },
            { title: "Temperatura" },
            { title: "Umidade" },
            { title: "CO" },
            { title: "Ruído" }
        ],
        data: []
    });

    // Buscar dados do back-end
    $('#fetch-samples').on('click', async () => {
        const start = $('#start-time').val();
        const end = $('#end-time').val();

        if (!start || !end) {
            alert('Por favor, preencha as datas de início e fim.');
            return;
        }

        try {
            // Converte as datas para o formato da API
            const apiStartDate = convertDateToAPIFormat(start);
            const apiEndDate = convertDateToAPIFormat(end);

            console.log('Datas enviadas para a API:', { start: apiStartDate, end: apiEndDate });

            const response = await fetch('/api/sensors/all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ start: apiStartDate, end: apiEndDate })
            });

            const data = await response.json();

            if (data.length === 0) {
                alert('Nenhum dado encontrado.');
                table.clear().draw();
                return;
            }

            // Formata os dados para a tabela
            const formattedData = data.map(row => {
                console.log('Row data:', row); // Debug log
                return [
                    formatDateToBR(row.time),
                    parseFloat(row.temp).toFixed(2),
                    parseFloat(row.umidade).toFixed(2),
                    parseFloat(row.co).toFixed(2),
                    parseFloat(row.ruido).toFixed(2)
                ];
            });

            // Atualiza a tabela com os novos dados
            table.clear().rows.add(formattedData).draw();
        } catch (err) {
            console.error('Erro ao buscar dados:', err);
            alert('Erro ao buscar dados. Por favor, tente novamente.');
        }
    });

    // Baixar os dados em Excel
    $('#download-excel').on('click', async () => {
        const start = $('#start-time').val();
        const end = $('#end-time').val();

        if (!start || !end) {
            alert('Por favor, preencha as datas de início e fim.');
            return;
        }

        try {
            // Converte as datas para o formato da API
            const apiStartDate = convertDateToAPIFormat(start);
            const apiEndDate = convertDateToAPIFormat(end);

            console.log('Datas enviadas para a API:', { start: apiStartDate, end: apiEndDate });

            const response = await fetch('/api/sensors/all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    start: apiStartDate, 
                    end: apiEndDate 
                })
            });

            const data = await response.json();

            if (data.length === 0) {
                alert('Nenhum dado encontrado.');
                return;
            }

            // Converter as datas para o formato brasileiro
            const formattedData = data.map(row => ({
                Data_Hora: formatDateToBR(row.time),
                Temperatura: parseFloat(row.temp).toFixed(2),
                Umidade: parseFloat(row.umidade).toFixed(2),
                CO: parseFloat(row.co).toFixed(2),
                Ruido: parseFloat(row.ruido).toFixed(2)
            }));

            // Criar uma planilha com os dados formatados
            const worksheet = XLSX.utils.json_to_sheet(formattedData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
            
            // Gerar nome do arquivo com a data atual
            const now = new Date();
            const fileName = `dados_${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}.xlsx`;
            
            XLSX.writeFile(workbook, fileName);
        } catch (err) {
            console.error('Erro ao baixar os dados:', err);
            alert('Erro ao baixar os dados. Por favor, tente novamente.');
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
        const start = $('#start-time').val();
        const end = $('#end-time').val();

        if (!start || !end) {
            alert('Por favor, preencha as datas de início e fim.');
            $('#download-modal').css('display', 'none');
            return;
        }

        try {
            const response = await fetch('/api/sensors/all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    start: convertDateToAPIFormat(start), 
                    end: convertDateToAPIFormat(end) 
                })
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
            alert('Erro ao baixar os dados. Por favor, tente novamente.');
        }
    });
});
