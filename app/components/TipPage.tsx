'use client';

import { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';

const CONTRACT_ABI = [
  "function sendTip(address _to, string _memo) payable",
  "function feeBps() view returns (uint256)",
  "function owner() view returns (address)"
];

function getQueryParam(name: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  return url.searchParams.get(name) || '';
}

interface TipPageProps {
  initialTo?: string;
  initialHandle?: string;
}

export function TipPage({ initialTo, initialHandle }: TipPageProps) {
  const [account, setAccount] = useState<string>('');
  const [to, setTo] = useState<string>(initialTo || '');
  const [amount, setAmount] = useState<string>('0.001');
  const [memo, setMemo] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [feeInfo, setFeeInfo] = useState<string>('');

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
  const chainIdEnv = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 0);
  const explorer = process.env.NEXT_PUBLIC_EXPLORER || '';

  useEffect(() => {
    if (!initialTo) {
      const p = getQueryParam('to');
      if (p) setTo(p);
    }
  }, [initialTo]);

  useEffect(() => {
    const loadInfo = async () => {
      try {
        // @ts-ignore
        const { ethereum } = window;
        if (!ethereum) return;
        const provider = new ethers.BrowserProvider(ethereum);
        const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
        const feeBps: bigint = await contract.feeBps();
        const owner: string = await contract.owner();
        const feePercent = Number(feeBps) / 100;
        setFeeInfo(`Taxa da plataforma: ${feePercent}% — Owner: ${owner}`);
      } catch {
        // silencioso
      }
    };
    loadInfo();
  }, [contractAddress]);

  const connect = async () => {
    try {
      setError('');
      // @ts-ignore
      const { ethereum } = window;
      if (!ethereum) {
        throw new Error('MetaMask não encontrada. Instale a extensão no navegador.');
      }

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);

      const currentChainHex = await ethereum.request({ method: 'eth_chainId' });
      const currentChain = parseInt(currentChainHex, 16);

      if (chainIdEnv && currentChain !== chainIdEnv) {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x' + chainIdEnv.toString(16) }]
        });
      }
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  const sendTip = async () => {
    try {
      setError('');
      setTxHash('');

      if (!ethers.isAddress(to)) {
        throw new Error('Endereço "to" inválido.');
      }

      if (!amount || Number(amount) <= 0) {
        throw new Error('Informe um valor maior que zero.');
      }

      // @ts-ignore
      const { ethereum } = window;
      if (!ethereum) {
        throw new Error('MetaMask não encontrada.');
      }

      const accounts: string[] = await ethereum.request({
        method: 'eth_requestAccounts',
      });
      const from = accounts[0];

      const currentChainHex = await ethereum.request({ method: 'eth_chainId' });
      const currentChain = parseInt(currentChainHex, 16);
      if (chainIdEnv && currentChain !== chainIdEnv) {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x' + chainIdEnv.toString(16) }],
        });
      }

      const iface = new ethers.Interface(CONTRACT_ABI);

      const safeMemo =
        memo && memo.trim().length > 0
          ? memo
          : ' ';

      const data = iface.encodeFunctionData('sendTip', [to, safeMemo]);

      const valueWei = ethers.parseEther(amount);
      const valueHex = '0x' + valueWei.toString(16);

      const txParams = {
        from,
        to: contractAddress,
        data,
        value: valueHex,
      };

      const txHash: string = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      setTxHash(txHash);
    } catch (e: any) {
      console.error(e);
      setError(e.message || String(e));
    }
  };

  const currentLink = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    if (!initialTo && to) {
      url.searchParams.set('to', to);
    } else if (!initialTo) {
      url.searchParams.delete('to');
    }
    return url.toString();
  }, [to, initialTo]);

  const displayHandle = initialHandle ? `@${initialHandle}` : 'TipJar — MVP';

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{displayHandle}</h1>
            <p className="text-sm text-gray-600">
              Envie/receba gorjetas em cripto. Use o parâmetro <code>?to=</code> com o endereço do criador
              ou acesse pela URL com handle.
            </p>
          </div>
          <button
            onClick={connect}
            className="px-4 py-2 rounded-xl bg-black text-white text-sm"
          >
            {account ? 'Wallet conectada' : 'Conectar Wallet'}
          </button>
        </header>

        {account && (
          <div className="text-xs text-gray-600 break-all">
            Conectado como: <span className="font-mono">{account}</span>
          </div>
        )}

        {feeInfo && (
          <div className="p-3 rounded-xl border bg-white text-xs text-gray-700">
            {feeInfo}
          </div>
        )}

        <div className="space-y-3 p-4 rounded-xl bg-white shadow">
          <div>
            <label className="block text-sm mb-1">Endereço do criador (to)</label>
            <input
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border rounded-xl text-sm font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              Esse é o endereço que vai receber 98% da gorjeta.
            </p>
          </div>

          <div>
            <label className="block text-sm mb-1">Valor (POL / MATIC)</label>
            <input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm"
              placeholder="0.001"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Mensagem (memo) opcional</label>
            <input
              value={memo}
              onChange={e => setMemo(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm"
              placeholder="Obrigado pelo conteúdo!"
            />
          </div>

          <button
            onClick={sendTip}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700"
          >
            Enviar Gorjeta
          </button>

          {txHash && (
            <div className="mt-3 p-3 rounded-xl bg-green-50 text-xs">
              <div className="font-semibold text-green-700 mb-1">Gorjeta enviada com sucesso!</div>
              {explorer && (
                <a
                  href={`${explorer}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-green-700 underline"
                >
                  Ver transação no explorer
                </a>
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-50 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        {!initialTo && (
          <div className="p-4 rounded-xl bg-white border space-y-2 text-xs text-gray-700">
            <div className="font-semibold">Seu link público (modo query)</div>
            <div className="break-all">{currentLink}</div>
            <p className="text-[11px] text-gray-500">Compartilhe este link com <code>?to=SEU_ENDERECO</code> para receber gorjetas.</p>
          </div>
        )}

        {initialTo && (
          <div className="p-4 rounded-xl bg-white border space-y-2 text-xs text-gray-700">
            <div className="font-semibold">Este handle está apontando para:</div>
            <div className="break-all font-mono">{initialTo}</div>
          </div>
        )}
      </div>
    </main>
  );
}