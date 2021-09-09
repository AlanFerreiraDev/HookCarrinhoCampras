import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      //Faço um novo array para não causar mudança no cart original
      const updatedCart = [...cart];
      const productExists = updatedCart.find(
        (product) => product.id === productId
      ); // true or false

      // Consulta na API
      // O productId é o valor do id na API
      const stock = await api.get(`/stock/${productId}`);

      // Quantidade no estoque
      const stockAmount = stock.data.amount;
      // Condição se tiver mostrar, senão, é zero
      const currentAmount = productExists ? productExists.amount : 0;
      // Quantidade desejada, solicitada pelo comprador, sempre de 1 em 1
      const amount = currentAmount + 1;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExists) {
        //Atualizo a quantidade de produto
        productExists.amount = amount;
      } else {
        const product = await api.get(`/products/${productId}`);
        // Crio um novo Produto com amount = 1, pq o tipo Product me passa um amount, mas a API não me manda nenhum amount, então eu crio
        const newProduct = {
          ...product.data,
          amount: 1,
        };
        // E perpetuo no array de cart, coloco esse valor lá
        updatedCart.push(newProduct);
        toast.success('Produto adicionado com sucesso no carrinho');
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      // Uso o findIndex, pq assim possom usar o splice p remover do array no momento de deletar o item do carrinho
      const productIndex = updatedCart.findIndex(
        (product) => product.id === productId
      );
      // A função findIndex retorna o array que acha, sendo true, e ao contrário retona -1, logo, maior que 0 encontrou o id
      if (productIndex >= 0) {
        //Apago 01 item do ProductIndex
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        //Forço dar um erro e para por aqui
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(
        (product) => product.id === productId
      );

      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
